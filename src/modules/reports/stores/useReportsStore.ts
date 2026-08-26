import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import axios from 'axios'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import { reportsApi } from '../api/reportsApi'
import { isJobInFlight } from '../types'
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
 */
const STORAGE_KEY = 'arch.reports.jobs'

/** Keeps the persisted list from growing without bound. */
const MAX_TRACKED_JOBS = 25

/** How often in-flight jobs are re-polled. */
const POLL_INTERVAL_MS = 5000

function readStoredJobs(): ReportJob[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ReportJob[]) : []
  } catch {
    return []
  }
}

function writeStoredJobs(jobs: ReportJob[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs.slice(0, MAX_TRACKED_JOBS)))
  } catch {
    // A full or disabled storage quota must never break report generation —
    // the in-memory list keeps working for the rest of the session.
  }
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

  async function fetchTypes(): Promise<void> {
    typesLoading.value = true
    typesError.value = null
    try {
      types.value = await reportsApi.types()
    } catch (err) {
      types.value = []
      typesError.value = getApiErrorMessage(err, 'Failed to load report types')
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
      digestError.value = getApiErrorMessage(err, 'Failed to load the weekly digest')
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

  /** Re-reads one job. A 404 means the row was pruned server-side, so drop it. */
  async function refreshJob(jobId: string): Promise<void> {
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
      // Anything else (offline, 5xx) is transient: leave the row alone so the
      // next tick can pick it up rather than dropping a job the user is
      // waiting on.
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
