import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import axios from 'axios'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import { authStorage } from '@/app/config/authStorage'
import { i18n } from '@/app/plugins/i18n'
import { reportsApi } from '../api/reportsApi'
import { REPORT_JOB_STATUSES, isJobInFlight } from '../types'
import type { GenerateReportInput, ReportJob, ReportTypeOption, WeeklyDigest } from '../types'

/**
 * Where the job history lives.
 *
 * The backend exposes no "list my report jobs" endpoint — only
 * `generate`, `{id}/status` and `{id}/download` (see `routes/api/v1.php`).
 * So the queue the user sees is the set of job ids this browser has created,
 * kept here and re-polled on every visit. Losing this list loses nothing the
 * server still needs: a job is downloadable from its id alone, and everything
 * expires after 7 days anyway.
 *
 * The key is namespaced per user id. Archive workstations are shared, and
 * `ReportPolicy::viewJob` only lets the original requester (or a Super Admin)
 * read a job — so a browser-global key would show the next person to sign in
 * the previous one's report metadata and then poll rows that answer 403 for
 * them forever.
 */
const STORAGE_PREFIX = 'arch.reports.jobs'

/** Keeps the persisted list from growing without bound. */
const MAX_TRACKED_JOBS = 25

/** How often in-flight jobs are re-polled. */
const POLL_INTERVAL_MS = 5000

function storageKey(): string {
  const id = authStorage.getUser()?.id
  return id === undefined || id === null ? `${STORAGE_PREFIX}.anon` : `${STORAGE_PREFIX}.u${id}`
}

/**
 * Narrows one persisted entry back onto `ReportJob`.
 *
 * Storage is not a trusted source: an entry can predate a shape change, be a
 * half-written string, or have been edited by hand. An unchecked cast leaks
 * `undefined` into `job.id` (polling would request `/reports/undefined/status`)
 * and into `job.status` (the badge renders the raw i18n key and the row never
 * polls again), so anything that does not match is dropped instead.
 */
function jobFromStorage(value: unknown): ReportJob | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>

  const str = (key: string): string | null => {
    const raw = row[key]
    return typeof raw === 'string' ? raw : null
  }

  const id = str('id')
  const status = str('status')
  if (id === null || id === '') return null
  if (status === null || !(REPORT_JOB_STATUSES as readonly string[]).includes(status)) return null

  return {
    id,
    type: str('type') ?? '',
    format: str('format') ?? '',
    status: status as ReportJob['status'],
    rowCount: typeof row.rowCount === 'number' ? row.rowCount : null,
    fileName: str('fileName'),
    createdAt: str('createdAt'),
    startedAt: str('startedAt'),
    completedAt: str('completedAt'),
    expiresAt: str('expiresAt'),
    errorMessage: str('errorMessage'),
    downloadUrl: str('downloadUrl'),
  }
}

/**
 * Reading is guarded as well as writing: `localStorage.getItem` throws a
 * `SecurityError` outright when storage is blocked (Safari's "block all
 * cookies", some enterprise policies, a third-party-storage-blocked iframe).
 * Unguarded, that throw happens during store setup and takes the whole page
 * down instead of merely losing the history.
 */
function readStoredJobs(): ReportJob[] {
  try {
    const raw = localStorage.getItem(storageKey())
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(jobFromStorage)
      .filter((job): job is ReportJob => job !== null)
      .slice(0, MAX_TRACKED_JOBS)
  } catch {
    return []
  }
}

function writeStoredJobs(jobs: ReportJob[]): void {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(jobs.slice(0, MAX_TRACKED_JOBS)))
  } catch {
    // A full or disabled storage quota must never break report generation —
    // the in-memory list keeps working for the rest of the session.
  }
}

/** Store-level fallback copy. Components read the same fragment via `useI18n`. */
function tr(key: string): string {
  return i18n.global.t(key)
}

export const useReportsStore = defineStore('reports', () => {
  const types = ref<ReportTypeOption[]>([])
  const typesLoading = ref(false)
  const typesError = ref<string | null>(null)

  const jobs = ref<ReportJob[]>(readStoredJobs())
  const generating = ref(false)

  const digest = ref<WeeklyDigest | null>(null)
  const digestLoading = ref(false)
  const digestError = ref<string | null>(null)

  const activeJobs = computed(() => jobs.value.filter((job) => isJobInFlight(job.status)))
  const hasActiveJobs = computed(() => activeJobs.value.length > 0)

  let pollTimer: ReturnType<typeof setInterval> | null = null

  function persist(): void {
    writeStoredJobs(jobs.value)
  }

  /**
   * Re-reads the list for whoever is signed in *now*.
   *
   * Signing in and out are plain router navigations, so this Pinia store
   * outlives a user switch. Called from the page's `onMounted`, this is what
   * stops the previous user's queue from staying on screen.
   */
  function hydrate(): void {
    jobs.value = readStoredJobs()
    if (!hasActiveJobs.value) stopPolling()
  }

  async function fetchTypes(): Promise<void> {
    typesLoading.value = true
    typesError.value = null
    try {
      types.value = await reportsApi.types()
    } catch (err) {
      types.value = []
      typesError.value = getApiErrorMessage(err, tr('reports.errors.typesTitle'))
    } finally {
      typesLoading.value = false
    }
  }

  async function fetchDigest(): Promise<void> {
    digestLoading.value = true
    digestError.value = null
    try {
      digest.value = await reportsApi.weeklyDigest()
    } catch (err) {
      digest.value = null
      digestError.value = getApiErrorMessage(err, tr('reports.digest.errorTitle'))
    } finally {
      digestLoading.value = false
    }
  }

  /** Enqueues a job and puts it at the top of the tracked list. Throws on failure. */
  async function generate(input: GenerateReportInput): Promise<ReportJob> {
    generating.value = true
    try {
      const job = await reportsApi.generate(input)
      jobs.value = [job, ...jobs.value.filter((row) => row.id !== job.id)].slice(
        0,
        MAX_TRACKED_JOBS,
      )
      persist()
      startPolling()
      return job
    } finally {
      generating.value = false
    }
  }

  /**
   * Re-reads one job. A 404 means the row was pruned server-side, so drop it.
   *
   * Background ticks swallow everything else — a 5xx or a dropped connection is
   * transient and the next tick picks it up. A *manual* refresh passes
   * `throwOnError` so the page can toast: an explicit button that silently does
   * nothing on a 403 or a timeout is worse than no button at all.
   */
  async function refreshJob(
    jobId: string,
    options: { throwOnError?: boolean } = {},
  ): Promise<void> {
    try {
      const fresh = await reportsApi.status(jobId)
      const index = jobs.value.findIndex((row) => row.id === jobId)
      if (index !== -1) jobs.value[index] = fresh
      persist()
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        removeJob(jobId)
        return
      }
      if (options.throwOnError) throw err
    }
  }

  function removeJob(jobId: string): void {
    jobs.value = jobs.value.filter((row) => row.id !== jobId)
    persist()
    if (!hasActiveJobs.value) stopPolling()
  }

  function clearJobs(): void {
    jobs.value = []
    persist()
    stopPolling()
  }

  /** Polls every tracked job that has not reached a terminal status yet. */
  async function pollActiveJobs(): Promise<void> {
    const ids = activeJobs.value.map((job) => job.id)
    if (ids.length === 0) {
      stopPolling()
      return
    }
    await Promise.all(ids.map((id) => refreshJob(id)))
    if (!hasActiveJobs.value) stopPolling()
  }

  /** Idempotent — safe to call from several components. */
  function startPolling(): void {
    if (pollTimer !== null || !hasActiveJobs.value) return
    pollTimer = setInterval(() => void pollActiveJobs(), POLL_INTERVAL_MS)
  }

  function stopPolling(): void {
    if (pollTimer === null) return
    clearInterval(pollTimer)
    pollTimer = null
  }

  return {
    types,
    typesLoading,
    typesError,
    jobs,
    generating,
    digest,
    digestLoading,
    digestError,
    activeJobs,
    hasActiveJobs,
    hydrate,
    fetchTypes,
    fetchDigest,
    generate,
    refreshJob,
    removeJob,
    clearJobs,
    pollActiveJobs,
    startPolling,
    stopPolling,
  }
})
