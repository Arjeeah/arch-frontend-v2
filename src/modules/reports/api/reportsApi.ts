import axios from 'axios'
import { http } from '@/app/plugins/axios'
import type {
  GenerateReportInput,
  ReportFilterField,
  ReportFilterType,
  ReportFormat,
  ReportJob,
  ReportJobStatus,
  ReportTypeKey,
  ReportTypeOption,
  WeeklyDigest,
} from '../types'
import { REPORT_FORMATS, REPORT_JOB_STATUSES, REPORT_TYPE_KEYS } from '../types'

/**
 * Endpoint table for this module.
 *
 * It is deliberately local rather than in `src/app/config/api.ts`: modules own
 * their own wire surface, and `src/app/` is off-limits to feature streams.
 * Backend ground truth: `routes/api/v1.php`, the `reports` prefix group.
 */
const REPORTS_ENDPOINTS = {
  types: '/v1/reports/types',
  generate: '/v1/reports/generate',
  weeklyDigest: '/v1/reports/weekly-digest',
  status: (jobId: string) => `/v1/reports/${jobId}/status`,
  download: (jobId: string) => `/v1/reports/${jobId}/download`,
} as const

/**
 * The shared axios instance is created with `timeout: 15_000` — right for JSON,
 * far too short for a generated workbook. A report over a few megabytes aborts
 * with `ECONNABORTED` on any ordinary link, so the download call overrides it.
 */
const DOWNLOAD_TIMEOUT_MS = 120_000

/* ── Wire shapes (snake_case, exactly as Laravel sends them) ─────────────── */

interface ReportFilterFieldResource {
  key: string
  type: string
  options?: string
}

interface ReportTypeResource {
  key: string
  label: string
  default_format: string
  formats: string[]
  filter_schema: ReportFilterFieldResource[]
  requires_faculty: boolean
}

interface ReportTypesResponse {
  data: ReportTypeResource[]
}

/** `ReportJobResource` — returned by both `generate` (202) and `{id}/status`. */
interface ReportJobResource {
  id: string
  type: string
  format: string
  status: string
  row_count: number | null
  file_name: string | null
  created_at: string | null
  started_at: string | null
  completed_at: string | null
  expires_at: string | null
  error_message: string | null
  download_url: string | null
}

interface ReportJobResponse {
  data: ReportJobResource
}

interface WeeklyDigestResource {
  overdue_files_count: number
  due_in_7_days_count: number
  weekly_borrowing_count: number
  storage_usage_percent: number
}

interface WeeklyDigestResponse {
  data: WeeklyDigestResource
}

/* ── Wire → UI mappers ──────────────────────────────────────────────────── */

const FILTER_TYPES: readonly ReportFilterType[] = [
  'string',
  'uuid',
  'date',
  'integer',
  'enum',
  'array',
]

/** Anything unrecognised degrades to a plain text box rather than disappearing. */
function toFilterType(raw: string): ReportFilterType {
  return (FILTER_TYPES as readonly string[]).includes(raw) ? (raw as ReportFilterType) : 'string'
}

function toFormat(raw: string, fallback: ReportFormat = 'xlsx'): ReportFormat {
  return (REPORT_FORMATS as readonly string[]).includes(raw) ? (raw as ReportFormat) : fallback
}

/**
 * Verified against `App\Enums\ReportJobStatus`, whose four cases —
 * `pending`, `processing`, `completed`, `failed` — are exactly
 * `REPORT_JOB_STATUSES`, and against live `generate`/`{id}/status` responses.
 * The fallback is therefore unreachable today; it is kept because degrading to
 * `pending` keeps the job list polling a row the server may still be working
 * on, which is the safe way to be wrong about a status the backend added.
 */
function toJobStatus(raw: string): ReportJobStatus {
  return (REPORT_JOB_STATUSES as readonly string[]).includes(raw)
    ? (raw as ReportJobStatus)
    : 'pending'
}

function isReportTypeKey(raw: string): raw is ReportTypeKey {
  return (REPORT_TYPE_KEYS as readonly string[]).includes(raw)
}

function filterFieldFromResource(resource: ReportFilterFieldResource): ReportFilterField {
  return {
    key: resource.key,
    type: toFilterType(resource.type),
    options: resource.options,
  }
}

function typeFromResource(resource: ReportTypeResource): ReportTypeOption | null {
  // A type the frontend does not know about is dropped rather than rendered
  // with a broken filter form; add the case to REPORT_TYPE_KEYS to enable it.
  if (!isReportTypeKey(resource.key)) return null

  const formats = (resource.formats ?? []).map((format) => toFormat(format))

  return {
    key: resource.key,
    label: resource.label,
    defaultFormat: toFormat(resource.default_format, formats[0] ?? 'xlsx'),
    formats,
    filterSchema: (resource.filter_schema ?? []).map(filterFieldFromResource),
    requiresFaculty: resource.requires_faculty,
  }
}

function jobFromResource(resource: ReportJobResource): ReportJob {
  return {
    id: resource.id,
    type: resource.type,
    format: resource.format,
    status: toJobStatus(resource.status),
    rowCount:
      resource.row_count === null || resource.row_count === undefined
        ? null
        : toNumber(resource.row_count),
    fileName: resource.file_name ?? null,
    createdAt: resource.created_at ?? null,
    startedAt: resource.started_at ?? null,
    completedAt: resource.completed_at ?? null,
    expiresAt: resource.expires_at ?? null,
    errorMessage: resource.error_message ?? null,
    downloadUrl: resource.download_url ?? null,
  }
}

/**
 * Coerces a wire number and refuses to hand `NaN` to `Intl.NumberFormat`, which
 * renders a KPI card as the literal "NaN".
 */
function toNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

/**
 * `ReportsService::weeklyDigestMetrics()` returns three `count()` integers plus
 * `round(StorageCapacityService::percentUsed(), 1)` — and `percentUsed()` is
 * `(used / total) * 100`, so it is **already on the 0–100 scale**, not a 0–1
 * fraction. `WeeklyDigestCard` divides by 100 for `Intl`'s percent style, which
 * is the only correct pairing: changing either half alone renders 42.5% as
 * 4,250% or as 0.4%.
 */
function digestFromResource(resource: WeeklyDigestResource): WeeklyDigest {
  return {
    overdueFilesCount: toNumber(resource.overdue_files_count),
    dueIn7DaysCount: toNumber(resource.due_in_7_days_count),
    weeklyBorrowingCount: toNumber(resource.weekly_borrowing_count),
    storageUsagePercent: toNumber(resource.storage_usage_percent),
  }
}

/* ── UI → wire mapper ───────────────────────────────────────────────────── */

/**
 * Builds the `generate` request body.
 *
 * Filter keys are *not* re-cased: they come straight out of the server's own
 * `filter_schema`, so they are already the snake_case names
 * `GenerateReportRequest` validates. Blank values are dropped — the backend
 * rules are all `sometimes`, and an empty string would fail `date`/`uuid`.
 */
function toPayload(input: GenerateReportInput): {
  type: string
  format: string
  filters: Record<string, string | number[]>
} {
  const filters: Record<string, string | number[]> = {}

  for (const [key, value] of Object.entries(input.filters)) {
    if (Array.isArray(value)) {
      if (value.length > 0) filters[key] = value
      continue
    }
    const trimmed = value.trim()
    if (trimmed !== '') filters[key] = trimmed
  }

  return { type: input.type, format: input.format, filters }
}

/* ── Blob helpers ───────────────────────────────────────────────────────── */

/** `attachment; filename="x.xlsx"` → `x.xlsx`. */
function fileNameFromDisposition(header: unknown): string | null {
  if (typeof header !== 'string') return null
  const match = /filename\*?=(?:UTF-8'')?((['"]).*?\2|[^;\n]*)/i.exec(header)
  if (!match?.[1]) return null
  const raw = match[1].replace(/['"]/g, '')
  // `decodeURIComponent` throws URIError on a lone `%` (`filename="100% x.xlsx"`),
  // which would turn an already-completed download into an error toast. The
  // undecoded name is a perfectly good file name, so fall back to it.
  let decoded: string
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    decoded = raw
  }
  return decoded.trim() || null
}

/**
 * With `responseType: 'blob'` axios hands back the *error* body as a Blob too,
 * so `getApiErrorMessage` would only ever see `[object Blob]`. The download
 * endpoint answers 409 (not ready) and 410 (expired/missing) with a JSON
 * `{ message }`, and those are exactly the two cases worth showing the user —
 * so read the blob back into text and rethrow a plain Error carrying it.
 */
async function readBlobMessage(blob: Blob): Promise<string | null> {
  try {
    const parsed: unknown = JSON.parse(await blob.text())
    if (parsed && typeof parsed === 'object' && 'message' in parsed) {
      const message = (parsed as { message?: unknown }).message
      if (typeof message === 'string' && message) return message
    }
  } catch {
    // Not JSON (a truncated stream, an HTML error page) — fall through and let
    // the caller surface the original axios error instead.
  }
  return null
}

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

/* ── Public API ─────────────────────────────────────────────────────────── */

export const reportsApi = {
  /**
   * Report types the signed-in user is allowed to generate (filtered
   * server-side). Verified live: super_admin sees all six, archivist sees five
   * (no `users`) and faculty_staff four (no `users`, no `weekly_digest`), so
   * the catalog is a safe basis for what the form offers.
   */
  types: async (): Promise<ReportTypeOption[]> => {
    const { data } = await http.get<ReportTypesResponse>(REPORTS_ENDPOINTS.types)
    return (data.data ?? [])
      .map(typeFromResource)
      .filter((option): option is ReportTypeOption => option !== null)
  },

  /** Enqueues a job. Responds 202 with the freshly created row. */
  generate: async (input: GenerateReportInput): Promise<ReportJob> => {
    const { data } = await http.post<ReportJobResponse>(
      REPORTS_ENDPOINTS.generate,
      toPayload(input),
    )
    return jobFromResource(data.data)
  },

  status: async (jobId: string): Promise<ReportJob> => {
    const { data } = await http.get<ReportJobResponse>(REPORTS_ENDPOINTS.status(jobId))
    return jobFromResource(data.data)
  },

  /** super_admin + archivist only — verified live: `faculty_staff` gets 403. */
  weeklyDigest: async (): Promise<WeeklyDigest> => {
    const { data } = await http.get<WeeklyDigestResponse>(REPORTS_ENDPOINTS.weeklyDigest)
    return digestFromResource(data.data)
  },

  /** Streams the generated file with the bearer token attached. */
  downloadFile: async (jobId: string, fallbackName: string): Promise<DownloadedFile> => {
    try {
      const response = await http.get<Blob>(REPORTS_ENDPOINTS.download(jobId), {
        responseType: 'blob',
        timeout: DOWNLOAD_TIMEOUT_MS,
      })
      return {
        blob: response.data,
        fileName: fileNameFromDisposition(response.headers['content-disposition']) ?? fallbackName,
      }
    } catch (err) {
      return rethrowBlobError(err)
    }
  },
}
