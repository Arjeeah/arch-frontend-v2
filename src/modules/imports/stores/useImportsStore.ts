import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import axios from 'axios'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import { importsApi } from '../api/importsApi'
import { isImportInFlight } from '../types'
import type { ImportEntity, ImportJob, ImportRowError } from '../types'

/**
 * Where the job history lives.
 *
 * As with reports, the backend has no "list my import jobs" endpoint — only
 * `POST /imports/{type}`, `{jobId}/status` and `{jobId}/errors`. The list the
 * user sees is therefore the set of job ids this browser has created, re-polled
 * on every visit. It also carries the two facts the status endpoint omits: the
 * entity that was imported and the uploaded file's name.
 */
const STORAGE_KEY = 'arch.imports.jobs'

const MAX_TRACKED_JOBS = 15

const POLL_INTERVAL_MS = 5000

function readStoredJobs(): ImportJob[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ImportJob[]) : []
  } catch {
    return []
  }
}

function writeStoredJobs(jobs: ImportJob[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs.slice(0, MAX_TRACKED_JOBS)))
  } catch {
    // A full or disabled storage quota must not break uploading.
  }
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
   */
  async function refreshJob(jobId: string): Promise<void> {
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
      // Transient failure — leave the row for the next tick.
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
      errorRowsError.value = getApiErrorMessage(err, 'Failed to load the failed rows')
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
