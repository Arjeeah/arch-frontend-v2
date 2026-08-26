import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import axios from 'axios'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import { authStorage } from '@/app/config/authStorage'
import { i18n } from '@/app/plugins/i18n'
import { importsApi } from '../api/importsApi'
import { IMPORT_ENTITIES, IMPORT_JOB_STATUSES, isImportInFlight } from '../types'
import type { ImportEntity, ImportJob, ImportRowError } from '../types'

/**
 * Where the job history lives.
 *
 * As with reports, the backend has no "list my import jobs" endpoint — only
 * `POST /imports/{type}`, `{jobId}/status` and `{jobId}/errors`. The list the
 * user sees is therefore the set of job ids this browser has created, re-polled
 * on every visit. It also carries the two facts the status endpoint omits: the
 * entity that was imported and the uploaded file's name.
 *
 * Namespaced per user id: archive workstations are shared, and the entity and
 * file name this list carries never came from the server — they came from
 * whoever did the upload. A browser-global key would hand the next person to
 * sign in the previous one's file names, and then poll rows that answer 403
 * for them forever: `ImportStatusController::status` does authorize `view`,
 * and `ImportPolicy::view` limits an archivist to jobs they created
 * themselves. Verified live — the archivist reading a super admin's import job
 * gets 403, as does the reports equivalent.
 */
const STORAGE_PREFIX = 'arch.imports.jobs'

const MAX_TRACKED_JOBS = 15

const POLL_INTERVAL_MS = 5000

function storageKey(): string {
  const id = authStorage.getUser()?.id
  return id === undefined || id === null ? `${STORAGE_PREFIX}.anon` : `${STORAGE_PREFIX}.u${id}`
}

/**
 * Narrows one persisted entry back onto `ImportJob`. Storage is not a trusted
 * source — an entry may predate a shape change or be half-written — and an
 * unchecked cast leaks `undefined` into `job.id` (the poll would request
 * `/imports/undefined/status`) and into `job.status` (the badge renders a raw
 * i18n key and the row never polls again).
 */
function jobFromStorage(value: unknown): ImportJob | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>

  const str = (key: string): string | null => {
    const raw = row[key]
    return typeof raw === 'string' ? raw : null
  }
  const count = (key: string): number => {
    const raw = row[key]
    return typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 ? raw : 0
  }

  const id = str('id')
  const status = str('status')
  if (id === null || id === '') return null
  if (status === null || !(IMPORT_JOB_STATUSES as readonly string[]).includes(status)) return null

  const entity = str('entity')

  return {
    id,
    status: status as ImportJob['status'],
    processedCount: count('processedCount'),
    successCount: count('successCount'),
    errorCount: count('errorCount'),
    startedAt: str('startedAt'),
    completedAt: str('completedAt'),
    entity:
      entity !== null && (IMPORT_ENTITIES as readonly string[]).includes(entity)
        ? (entity as ImportEntity)
        : null,
    fileName: str('fileName'),
  }
}

/**
 * Guarded on read as well as on write: `localStorage.getItem` throws outright
 * when storage is blocked (Safari's "block all cookies", enterprise policy, a
 * storage-blocked iframe), and an unguarded throw during store setup takes the
 * page down rather than merely losing the history.
 */
function readStoredJobs(): ImportJob[] {
  try {
    const raw = localStorage.getItem(storageKey())
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(jobFromStorage)
      .filter((job): job is ImportJob => job !== null)
      .slice(0, MAX_TRACKED_JOBS)
  } catch {
    return []
  }
}

function writeStoredJobs(jobs: ImportJob[]): void {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(jobs.slice(0, MAX_TRACKED_JOBS)))
  } catch {
    // A full or disabled storage quota must not break uploading.
  }
}

/** Store-level fallback copy. Components read the same fragment via `useI18n`. */
function tr(key: string): string {
  return i18n.global.t(key)
}

export const useImportsStore = defineStore('imports', () => {
  const jobs = ref<ImportJob[]>(readStoredJobs())
  const uploading = ref(false)
  /** 0–100 for the file currently being sent, keyed by its name for AppFileUpload. */
  const uploadProgress = ref<Record<string, number>>({})

  const errorRows = ref<ImportRowError[]>([])
  const errorRowsJobId = ref<string | null>(null)
  const errorRowsLoading = ref(false)
  const errorRowsError = ref<string | null>(null)

  const activeJobs = computed(() => jobs.value.filter((job) => isImportInFlight(job.status)))
  const hasActiveJobs = computed(() => activeJobs.value.length > 0)

  let pollTimer: ReturnType<typeof setInterval> | null = null

  function persist(): void {
    writeStoredJobs(jobs.value)
  }

  /**
   * Re-reads the list for whoever is signed in *now*. Signing in and out are
   * plain router navigations, so this Pinia store outlives a user switch; the
   * page calls this on mount so the previous user's history does not linger.
   */
  function hydrate(): void {
    jobs.value = readStoredJobs()
    clearErrorRows()
    if (!hasActiveJobs.value) stopPolling()
  }

  function upsert(job: ImportJob): void {
    const index = jobs.value.findIndex((row) => row.id === job.id)
    if (index === -1) {
      jobs.value = [job, ...jobs.value].slice(0, MAX_TRACKED_JOBS)
    } else {
      jobs.value[index] = job
    }
    persist()
  }

  /** Uploads one workbook. Throws so the page can toast the API's message. */
  async function upload(entity: ImportEntity, file: File): Promise<ImportJob> {
    uploading.value = true
    uploadProgress.value = { [file.name]: 0 }
    try {
      const job = await importsApi.upload(entity, file, (percent) => {
        uploadProgress.value = { [file.name]: percent }
      })
      upsert(job)
      startPolling()
      return job
    } finally {
      uploading.value = false
      uploadProgress.value = {}
    }
  }

  /**
   * Re-reads one job, keeping the entity/file name the status endpoint does not
   * return. A 404 means the row is gone server-side, so it is dropped here too.
   *
   * Background ticks swallow every other failure — it is transient and the next
   * tick retries. A *manual* refresh passes `throwOnError` so the page can
   * toast; a button that silently does nothing is worse than no button.
   */
  async function refreshJob(
    jobId: string,
    options: { throwOnError?: boolean } = {},
  ): Promise<void> {
    const existing = jobs.value.find((row) => row.id === jobId)
    try {
      const fresh = await importsApi.status(jobId, {
        entity: existing?.entity ?? null,
        fileName: existing?.fileName ?? null,
      })
      upsert(fresh)
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
    if (errorRowsJobId.value === jobId) clearErrorRows()
    persist()
    if (!hasActiveJobs.value) stopPolling()
  }

  function clearJobs(): void {
    jobs.value = []
    clearErrorRows()
    persist()
    stopPolling()
  }

  function clearErrorRows(): void {
    errorRows.value = []
    errorRowsJobId.value = null
    errorRowsError.value = null
  }

  /** Loads (or reloads) the failed rows of one job into `errorRows`. */
  async function fetchErrorRows(jobId: string): Promise<void> {
    errorRowsJobId.value = jobId
    errorRowsLoading.value = true
    errorRowsError.value = null
    try {
      errorRows.value = await importsApi.errorRows(jobId)
    } catch (err) {
      errorRows.value = []
      errorRowsError.value = getApiErrorMessage(err, tr('imports.errors.loadFailed'))
    } finally {
      errorRowsLoading.value = false
    }
  }

  async function pollActiveJobs(): Promise<void> {
    const ids = activeJobs.value.map((job) => job.id)
    if (ids.length === 0) {
      stopPolling()
      return
    }
    await Promise.all(ids.map((id) => refreshJob(id)))
    if (!hasActiveJobs.value) stopPolling()
  }

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
    jobs,
    uploading,
    uploadProgress,
    errorRows,
    errorRowsJobId,
    errorRowsLoading,
    errorRowsError,
    activeJobs,
    hasActiveJobs,
    hydrate,
    upload,
    refreshJob,
    removeJob,
    clearJobs,
    clearErrorRows,
    fetchErrorRows,
    pollActiveJobs,
    startPolling,
    stopPolling,
  }
})
