import type { PipelineStatus } from './status'

/**
 * How many documents sit in each pipeline state, across the whole archive.
 *
 * `GET /v1/pipeline/status` groups by `pipeline_status`, so a state with no rows
 * is simply absent from the payload. The mapper fills every state in with `0`
 * so the monitor's cards never flicker between "0" and blank.
 */
export type PipelineStatusCounts = Record<PipelineStatus, number>

/** Per-document pipeline detail — `DocumentPipelineStatusResource`. */
export interface DocumentPipelineStatus {
  documentId: string
  status: PipelineStatus
  /** Arabic label rendered by the API's enum (`PipelineStatus::label()`). */
  statusLabel: string
  /** Failure reason recorded by `markFailed()`; null unless the state is `failed`. */
  error: string | null
  hasOcrContent: boolean
  /** Pages OCR produced for this document. */
  pageCount: number
  hasRefinement: boolean
  /**
   * 0–100 from the AI refinement, or null before one exists. The backend's
   * auto-classify threshold sits on the same scale (`85`).
   */
  confidenceScore: number | null
  /** Whatever the refinement extracted; shape varies by document type. */
  structuredData: Record<string, unknown> | null
  additionalFields: Record<string, unknown> | null
  /**
   * Pages that have an embedding. The wire calls this `has_embeddings` but the
   * resource fills it with `->count()`, so it is a page tally, not a flag.
   */
  embeddedPageCount: number
  isVerified: boolean
  verifiedBy: string | null
  verifiedAt: string | null
}

/**
 * A row of the monitor list — `StudentDocumentResource`.
 *
 * Bulk-imported documents are created with nothing but a pipeline status, so
 * every identity field here is null until the pipeline (or a human) fills it in.
 */
export interface PipelineDocument {
  id: string
  fileNumber: string | null
  fileStatus: string | null
  studentId: string | null
  studentName: string | null
  studentNumber: string | null
  documentTypeId: string | null
  documentTypeName: string | null
  fileName: string | null
  fileUrl: string | null
  submittedAt: string | null
  createdAt: string | null
  /**
   * Pipeline state, inlined on the list resource — no follow-up request per
   * row. Verified against the live API: `StudentDocumentResource` emits
   * `pipeline_status`, `pipeline_status_label` and `pipeline_error` alongside
   * the identity fields.
   */
  pipelineStatus: PipelineStatus
  /** Arabic label rendered by the API's enum (`PipelineStatus::label()`). */
  pipelineStatusLabel: string | null
  /** Failure reason recorded by `markFailed()`; null unless the state is `failed`. */
  pipelineError: string | null
}

/** Result of a bulk import — `BulkImportResponseResource`. */
export interface BulkImportResult {
  /**
   * How many files this client put on the wire.
   *
   * Not part of the response — recorded by the api mapper so the screen can
   * check the server's tally against it. PHP drops uploads past
   * `max_file_uploads` (20 by default) *before* Laravel validates, so a
   * truncated batch comes back as a perfectly ordinary 202 and the missing
   * files would otherwise vanish without a word.
   */
  submittedCount: number
  documentsQueued: number
  documentIds: string[]
}

/**
 * Server-side filters `/v1/student-documents` actually supports.
 *
 * A `type` rather than an `interface` on purpose: only type aliases get an
 * implicit index signature, and without one this is not assignable to the
 * `Record<string, unknown>` that `useServerTable`'s `setFilters` takes.
 */
export type PipelineDocumentFilters = {
  /** Partial match on `file_number`. */
  fileNumber?: string
  /** Exact match: `complete` | `incomplete` | `draft`. */
  fileStatus?: string
}

/** Physical file states — `App\Enums\FileStatus`. Unrelated to the pipeline. */
export const FILE_STATUSES = ['complete', 'incomplete', 'draft'] as const

export type FileStatus = (typeof FILE_STATUSES)[number]
