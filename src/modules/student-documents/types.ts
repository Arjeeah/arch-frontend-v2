/**
 * Student-document domain types.
 *
 * A "student document" is one scanned paper file. Creating it kicks off the
 * OCR → refinement → embedding pipeline, so most of this module is about
 * showing where a document has got to.
 */

/** `App\Enums\FileStatus` — how complete the paper file is. */
export const FILE_STATUSES = ['complete', 'incomplete', 'draft'] as const

export type FileStatus = (typeof FILE_STATUSES)[number]

/** `App\Enums\Pipeline\PipelineStatus`, in the order the pipeline runs. */
export const PIPELINE_STATUSES = [
  'pending',
  'ocr_processing',
  'ocr_completed',
  'refining',
  'refined',
  'embedding',
  'completed',
  'failed',
] as const

export type PipelineStatus = (typeof PIPELINE_STATUSES)[number]

/** Statuses that mean the pipeline is still working — worth polling through. */
export const PIPELINE_BUSY_STATUSES: readonly PipelineStatus[] = [
  'pending',
  'ocr_processing',
  'ocr_completed',
  'refining',
  'refined',
  'embedding',
]

export interface DocumentTypeRef {
  id: string
  name: string
}

/** Just enough of the student to label the document. */
export interface StudentRef {
  id: string
  name: string
  studentNumber: string
}

export interface StudentDocument {
  id: string
  studentId: string
  student: StudentRef | null
  documentTypeId: string | null
  documentType: DocumentTypeRef | null
  /** Server-generated (`DOC-YYYYMMDD-XXXXXXXX`); never sent by the client. */
  fileNumber: string
  fileStatus: FileStatus
  notes: string | null
  submittedAt: string | null
  fileUrl: string | null
  fileName: string | null
  createdAt: string | null
  updatedAt: string | null
}

/** What `StoreStudentDocumentRequest` accepts. */
export interface StudentDocumentInput {
  studentId: string
  documentTypeId: string
  fileStatus: FileStatus
  notes: string | null
  submittedAt: string | null
  /** Id from `POST /v1/uploads`; attaching it is what starts the pipeline. */
  tempUploadId: string | null
}

/** `App\Http\Resources\TempUploadResource`. */
export interface TempUpload {
  id: string
  originalName: string
  mimeType: string
  size: number
  expiresAt: string | null
}

/** `App\Http\Resources\Pipeline\DocumentPipelineStatusResource`. */
export interface PipelineStatusDetail {
  documentId: string
  status: PipelineStatus
  /** Arabic label rendered by `PipelineStatus::label()`. */
  statusLabel: string
  error: string | null
  hasOcrContent: boolean
  pageCount: number
  hasRefinement: boolean
  /**
   * `confidence_score` as stored — `RefinementData` rescales the model's
   * 0.0–1.0 answer to 0–100, so this is normally a percentage.
   */
  confidenceScore: number | null
  /** Whatever the AI extracted — shape is prompt-driven, so keep it loose. */
  structuredData: Record<string, unknown> | null
  additionalFields: Record<string, unknown> | null
  embeddedPages: number
  isVerified: boolean
  verifiedBy: string | null
  verifiedAt: string | null
}

/**
 * One of the individual documents the AI detected inside a scanned bundle.
 * Only the AI-console endpoint exposes these — see `documentLookupsApi.segments`.
 */
export interface DocumentSegment {
  sequence: number
  pageStart: number | null
  pageEnd: number | null
  detectedType: string | null
  detectedTypeAr: string | null
  matchedType: string | null
  confidence: number | null
  error: string | null
}

/** `{ value, label }` pair for `AppSelect` / `AppAsyncSelect`. */
export interface LookupOption {
  value: string
  label: string
}

/**
 * What `DocumentMetaDialog` hands back — the subset `UpdateStudentDocumentRequest`
 * accepts, plus an optional replacement scan the page stages before saving.
 * Declared here rather than in the SFC: `<script setup>` cannot export.
 */
export interface DocumentMetaEdit {
  fileStatus: FileStatus
  notes: string | null
  submittedAt: string | null
  /** A new scan to put in place of the current one, or `null` to keep it. */
  replacement: File | null
}

/** Upload limits mirrored from `TempUploadRequest` and the pipeline's inputs. */
export const UPLOAD_MAX_SIZE_MB = 10
export const UPLOAD_ACCEPT = '.pdf,.png,.jpg,.jpeg,.tiff'
