/**
 * Excel imports module — UI models.
 *
 * Backend ground truth: `app/Http/Controllers/Admin/Import/*`,
 * `app/Models/ImportJob.php`, `app/Models/ImportError.php`,
 * `app/Exports/ImportTemplateExport.php`.
 */

/** The five entities `ImportController::store` accepts as `{type}`. */
export const IMPORT_ENTITIES = [
  'faculties',
  'programs',
  'students',
  'users',
  'student_documents',
] as const

export type ImportEntity = (typeof IMPORT_ENTITIES)[number]

/** `import_jobs.status` — a plain string column, written only by the queue worker. */
export const IMPORT_JOB_STATUSES = ['pending', 'processing', 'completed', 'failed'] as const

export type ImportJobStatus = (typeof IMPORT_JOB_STATUSES)[number]

/** `ImportController::store` uses `mimes:xlsx,csv` with `max:10240` (KB). */
export const IMPORT_ACCEPT = '.xlsx,.csv'
export const IMPORT_MAX_SIZE_MB = 10

/**
 * One row of `GET /v1/imports/{jobId}/status`.
 *
 * `type` and `fileName` are *not* on that response — they are remembered
 * locally from the upload that created the job, so the history list can label
 * a row without a second endpoint.
 */
export interface ImportJob {
  id: string
  status: ImportJobStatus
  processedCount: number
  successCount: number
  errorCount: number
  startedAt: string | null
  completedAt: string | null
  /** Remembered client-side from the upload; never sent by the status endpoint. */
  entity: ImportEntity | null
  /** Remembered client-side from the upload; never sent by the status endpoint. */
  fileName: string | null
}

/** A single failed row, read from the errors export (see `api/importsApi.ts`). */
export interface ImportRowError {
  rowNumber: number | null
  attribute: string
  message: string
  /** The original spreadsheet row, as column → value. */
  rowData: Record<string, string>
  createdAt: string | null
}

/** Statuses that still move, so the page keeps polling. */
export function isImportInFlight(status: ImportJobStatus): boolean {
  return status === 'pending' || status === 'processing'
}

/**
 * The columns each template sheet ships with, mirrored from
 * `ImportTemplateExport::getTemplateData()`. Shown next to the download button
 * so a user can sanity-check a file they built by hand.
 *
 * `required: false` marks the two optional columns the Notes sheet documents.
 */
export interface TemplateColumn {
  name: string
  required: boolean
}

export const TEMPLATE_COLUMNS: Record<ImportEntity, TemplateColumn[]> = {
  faculties: [
    { name: 'code', required: true },
    { name: 'name_ar', required: true },
    { name: 'name_en', required: true },
  ],
  programs: [
    { name: 'faculty_code', required: true },
    { name: 'code', required: true },
    { name: 'name_ar', required: true },
    { name: 'name_en', required: true },
  ],
  students: [
    { name: 'student_number', required: true },
    { name: 'name', required: true },
    { name: 'nationality', required: false },
    { name: 'faculty_code', required: true },
    { name: 'program_code', required: true },
    { name: 'enrollment_year', required: true },
  ],
  users: [
    { name: 'email', required: true },
    { name: 'name', required: true },
    { name: 'role', required: true },
    { name: 'faculty_codes', required: false },
  ],
  student_documents: [
    { name: 'student_number', required: true },
    { name: 'document_type', required: true },
    { name: 'file_number', required: true },
  ],
}
