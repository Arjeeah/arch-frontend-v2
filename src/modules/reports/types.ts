/**
 * Reports module — UI models.
 *
 * Wire shapes (snake_case) live in `api/reportsApi.ts`; everything below is the
 * camelCase model the components render. Backend ground truth:
 * `app/Enums/ReportType.php`, `app/Enums/ReportJobStatus.php`,
 * `app/Http/Resources/ReportJobResource.php`.
 */

/** Every `ReportType` case the backend exposes. */
export const REPORT_TYPE_KEYS = [
  'audit_logs',
  'borrowings',
  'student_documents',
  'users',
  'weekly_digest',
  'faculty_report',
] as const

export type ReportTypeKey = (typeof REPORT_TYPE_KEYS)[number]

/** `GenerateReportRequest` accepts exactly these three. */
export const REPORT_FORMATS = ['csv', 'xlsx', 'pdf'] as const

export type ReportFormat = (typeof REPORT_FORMATS)[number]

export const REPORT_JOB_STATUSES = ['pending', 'processing', 'completed', 'failed'] as const

export type ReportJobStatus = (typeof REPORT_JOB_STATUSES)[number]

/**
 * The `type` strings `ReportType::filterSchema()` emits for a filter field.
 * `enum` fields also carry `options`, the PHP enum class name.
 */
export type ReportFilterType = 'string' | 'uuid' | 'date' | 'integer' | 'enum' | 'array'

export interface ReportFilterField {
  /** snake_case key, sent back verbatim inside `filters`. */
  key: string
  type: ReportFilterType
  /** PHP enum short name, e.g. `BorrowingStatus`. Only set when `type === 'enum'`. */
  options?: string
}

/** One entry of the `/v1/reports/types` catalog (already role-filtered server-side). */
export interface ReportTypeOption {
  key: ReportTypeKey
  /** English label from the enum. The UI prefers its own translation and falls back to this. */
  label: string
  defaultFormat: ReportFormat
  formats: ReportFormat[]
  filterSchema: ReportFilterField[]
  requiresFaculty: boolean
}

/**
 * A queued/finished report job.
 *
 * `type` and `format` stay raw strings: they are display-only here, and the
 * label shown comes from the types catalog, so inventing a fallback union
 * member for an unknown value would hide a backend change rather than surface
 * it. `status` *is* narrowed — it drives polling, the badge colour and whether
 * the download button is enabled.
 */
export interface ReportJob {
  id: string
  type: string
  format: string
  status: ReportJobStatus
  rowCount: number | null
  fileName: string | null
  createdAt: string | null
  startedAt: string | null
  completedAt: string | null
  expiresAt: string | null
  errorMessage: string | null
  /**
   * Absolute URL from the API. Never navigate to it directly — the endpoint is
   * Sanctum-protected, so it has to be fetched with the bearer token attached
   * (`reportsApi.downloadFile`). Non-null only while the file exists and is
   * inside its 7-day retention window.
   */
  downloadUrl: string | null
}

/** Values a filter field can hold before it is serialised into `filters`. */
export type ReportFilterValue = string | number[]

/** Body of `POST /v1/reports/generate`. */
export interface GenerateReportInput {
  type: ReportTypeKey
  format: ReportFormat
  filters: Record<string, ReportFilterValue>
}

/** `GET /v1/reports/weekly-digest` — four KPI numbers, super_admin + archivist only. */
export interface WeeklyDigest {
  overdueFilesCount: number
  dueIn7DaysCount: number
  weeklyBorrowingCount: number
  storageUsagePercent: number
}

/** Statuses that are still moving, so the job list keeps polling them. */
export function isJobInFlight(status: ReportJobStatus): boolean {
  return status === 'pending' || status === 'processing'
}
