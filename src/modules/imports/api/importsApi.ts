import axios from 'axios'
import { http } from '@/app/plugins/axios'
import { parseCsv } from '../utils/csv'
import { IMPORT_JOB_STATUSES } from '../types'
import type { ImportEntity, ImportJob, ImportJobStatus, ImportRowError } from '../types'

/**
 * Endpoint table for this module — local because `src/app/config/api.ts` is
 * owned by the shell, not by a feature stream. Backend ground truth:
 * `routes/api/v1.php`, the "Excel Imports" block.
 */
const IMPORTS_ENDPOINTS = {
  template: (type: ImportEntity) => `/v1/imports/templates/${type}`,
  upload: (type: ImportEntity) => `/v1/imports/${type}`,
  status: (jobId: string) => `/v1/imports/${jobId}/status`,
  errors: (jobId: string) => `/v1/imports/${jobId}/errors`,
} as const

/* ── Wire shapes ────────────────────────────────────────────────────────── */

/**
 * `ImportController::store` answers 202 with a bare object — no `data`
 * envelope, unlike most of this API. Same for the status endpoint below.
 */
interface ImportUploadResource {
  job_id: string
  status: string
}

interface ImportStatusResource {
  job_id: string
  status: string
  processed_count: number
  success_count: number
  error_count: number
  started_at: string | null
  completed_at: string | null
}

/* ── Wire → UI mappers ──────────────────────────────────────────────────── */

/**
 * verify against live API: an unrecognised status is treated as `pending` so
 * the page keeps polling rather than freezing a job that is still running.
 */
function toJobStatus(raw: string): ImportJobStatus {
  return (IMPORT_JOB_STATUSES as readonly string[]).includes(raw)
    ? (raw as ImportJobStatus)
    : 'pending'
}

/**
 * `entity` / `fileName` are not on the wire — the caller supplies what it
 * knows from the upload it just made, and the history list keeps them.
 */
function jobFromStatusResource(
  resource: ImportStatusResource,
  known: { entity: ImportEntity | null; fileName: string | null },
): ImportJob {
  return {
    id: resource.job_id,
    status: toJobStatus(resource.status),
    processedCount: resource.processed_count ?? 0,
    successCount: resource.success_count ?? 0,
    errorCount: resource.error_count ?? 0,
    startedAt: resource.started_at ?? null,
    completedAt: resource.completed_at ?? null,
    entity: known.entity,
    fileName: known.fileName,
  }
}

/* ── Blob helpers ───────────────────────────────────────────────────────── */

function fileNameFromDisposition(header: unknown): string | null {
  if (typeof header !== 'string') return null
  const match = /filename\*?=(?:UTF-8'')?((['"]).*?\2|[^;\n]*)/i.exec(header)
  if (!match?.[1]) return null
  return decodeURIComponent(match[1].replace(/['"]/g, '')).trim() || null
}

async function readBlobMessage(blob: Blob): Promise<string | null> {
  try {
    const parsed: unknown = JSON.parse(await blob.text())
    if (parsed && typeof parsed === 'object' && 'message' in parsed) {
      const message = (parsed as { message?: unknown }).message
      if (typeof message === 'string' && message) return message
    }
  } catch {
    // Not JSON — let the caller surface the original axios error.
  }
  return null
}

/**
 * `responseType: 'blob'` hands error bodies back as Blobs too, so Laravel's
 * `{ message }` would otherwise be lost behind `[object Blob]`.
 */
async function rethrowBlobError(err: unknown): Promise<never> {
  if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
    const message = await readBlobMessage(err.response.data)
    if (message) throw new Error(message)
  }
  throw err
}

export interface DownloadedFile {
  blob: Blob
  fileName: string
}

/* ── Error-sheet parsing ────────────────────────────────────────────────── */

/** Column order of `ImportErrorsExport::headings()`. */
const ERROR_HEADINGS = ['row_number', 'attribute', 'message', 'row_data', 'created_at'] as const

/** `{"code":"ENG","name":null}` → `{ code: 'ENG', name: '' }`. */
function parseRowData(raw: string): Record<string, string> {
  if (!raw.trim()) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: Record<string, string> = {}
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      out[key] = value === null || value === undefined ? '' : String(value)
    }
    return out
  } catch {
    // Not JSON after all — show it verbatim rather than dropping the row.
    return { value: raw }
  }
}

/**
 * Turns the errors export into rows.
 *
 * The header line is matched by name, so a reordered or extended
 * `ImportErrorsExport` keeps working; if the header is missing entirely the
 * documented column order is assumed.
 */
export function parseImportErrors(csv: string): ImportRowError[] {
  const rows = parseCsv(csv)
  if (rows.length === 0) return []

  const header = rows[0] ?? []
  const looksLikeHeader = header.some((cell) =>
    (ERROR_HEADINGS as readonly string[]).includes(cell.trim().toLowerCase()),
  )

  const index: Record<(typeof ERROR_HEADINGS)[number], number> = {
    row_number: 0,
    attribute: 1,
    message: 2,
    row_data: 3,
    created_at: 4,
  }

  if (looksLikeHeader) {
    for (const name of ERROR_HEADINGS) {
      index[name] = header.findIndex((cell) => cell.trim().toLowerCase() === name)
    }
  }

  const cellAt = (row: string[], position: number): string =>
    position >= 0 ? (row[position] ?? '') : ''

  return rows.slice(looksLikeHeader ? 1 : 0).map((row) => {
    const rowNumber = Number(cellAt(row, index.row_number))
    return {
      rowNumber:
        Number.isFinite(rowNumber) && cellAt(row, index.row_number) !== '' ? rowNumber : null,
      attribute: cellAt(row, index.attribute),
      message: cellAt(row, index.message),
      rowData: parseRowData(cellAt(row, index.row_data)),
      createdAt: cellAt(row, index.created_at) || null,
    }
  })
}

/* ── Public API ─────────────────────────────────────────────────────────── */

export const importsApi = {
  /** The two-sheet .xlsx template (Template + Notes) for one entity. */
  downloadTemplate: async (type: ImportEntity): Promise<DownloadedFile> => {
    try {
      const response = await http.get<Blob>(IMPORTS_ENDPOINTS.template(type), {
        responseType: 'blob',
      })
      return {
        blob: response.data,
        fileName:
          fileNameFromDisposition(response.headers['content-disposition']) ??
          `${type}_template.xlsx`,
      }
    } catch (err) {
      return rethrowBlobError(err)
    }
  },

  /**
   * Uploads a workbook and returns the queued job. 202 + `{ job_id, status }`;
   * the counters only appear once the status endpoint is polled.
   */
  upload: async (
    type: ImportEntity,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<ImportJob> => {
    const form = new FormData()
    form.append('file', file)

    const { data } = await http.post<ImportUploadResource>(IMPORTS_ENDPOINTS.upload(type), form, {
      onUploadProgress: (event) => {
        if (!onProgress || !event.total) return
        onProgress(Math.round((event.loaded / event.total) * 100))
      },
    })

    return {
      id: data.job_id,
      status: toJobStatus(data.status),
      processedCount: 0,
      successCount: 0,
      errorCount: 0,
      startedAt: null,
      completedAt: null,
      entity: type,
      fileName: file.name,
    }
  },

  status: async (
    jobId: string,
    known: { entity: ImportEntity | null; fileName: string | null },
  ): Promise<ImportJob> => {
    const { data } = await http.get<ImportStatusResource>(IMPORTS_ENDPOINTS.status(jobId))
    return jobFromStatusResource(data, known)
  },

  /**
   * The failed rows, read out of the CSV rendering of the errors export.
   *
   * There is no JSON endpoint for them: `ImportStatusController::errors` only
   * streams a spreadsheet. Fetching the CSV variant and parsing it client-side
   * is what makes an on-screen error table possible at all — swap this for a
   * plain `GET` the day the backend grows a JSON route.
   */
  errorRows: async (jobId: string): Promise<ImportRowError[]> => {
    try {
      const response = await http.get<Blob>(IMPORTS_ENDPOINTS.errors(jobId), {
        params: { format: 'csv' },
        responseType: 'blob',
      })
      return parseImportErrors(await response.data.text())
    } catch (err) {
      return rethrowBlobError(err)
    }
  },

  /** The same errors as a spreadsheet, for saving. */
  downloadErrors: async (
    jobId: string,
    format: 'xlsx' | 'csv' = 'xlsx',
  ): Promise<DownloadedFile> => {
    try {
      const response = await http.get<Blob>(IMPORTS_ENDPOINTS.errors(jobId), {
        params: { format },
        responseType: 'blob',
      })
      return {
        blob: response.data,
        fileName:
          fileNameFromDisposition(response.headers['content-disposition']) ??
          `import_errors_${jobId}.${format}`,
      }
    } catch (err) {
      return rethrowBlobError(err)
    }
  },
}
