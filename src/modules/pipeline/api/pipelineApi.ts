import axios from 'axios'
import { http } from '@/app/plugins/axios'
import type { ServerTableParams, ServerTableResponse } from '@/shared/composables/useServerTable'
import { PIPELINE_STATUSES, isPipelineStatus, type PipelineStatus } from '../status'
import type {
  BulkImportResult,
  DocumentPipelineStatus,
  PipelineDocument,
  PipelineStatusCounts,
  UploadTruncation,
} from '../types'

/**
 * Endpoints this module owns.
 *
 * They live here rather than in `src/app/config/api.ts` because that file is
 * outside the module's territory — and keeping the paths next to the mappers
 * that decode them means one file to read when the wire changes.
 */
const ENDPOINTS = {
  bulkImport: '/v1/bulk-import',
  statusCounts: '/v1/pipeline/status',
  documentStatus: (id: string) => `/v1/pipeline/status/${id}`,
  retry: (id: string) => `/v1/pipeline/${id}/retry`,
  documents: '/v1/student-documents',
} as const

/** Backend cap on one bulk-import request — `BulkImportRequest::rules()`. */
export const BULK_IMPORT_MAX_FILES = 500

/**
 * Per-file size cap in MB.
 *
 * The wire rule is no longer a literal: `ResolvesUploadWhitelist` derives it
 * from the administrator-managed `storage.max_file_size` setting, whose shipped
 * value is 20 MB — verified live against `GET /v1/settings/storage`. Restating
 * it here keeps the client from uploading a file the server will refuse; an
 * administrator who lowers the setting makes this optimistic, and the server's
 * 422 is still the backstop.
 */
export const BULK_IMPORT_MAX_SIZE_MB = 20

/**
 * Accepted file types.
 *
 * Also derived server-side now, from `storage.allowed_extensions` — which ships
 * wider than this list (it includes `bmp`, `gif` and several office formats).
 * This stays deliberately narrow: bulk import feeds an OCR/vision pipeline, and
 * offering `.docx` on a scanner intake screen invites a file the pipeline can
 * do nothing useful with. Narrower than the server is always safe; wider is not.
 *
 * `.tif` is spelled out alongside `.tiff` because a scanner writing the short
 * extension is ordinary, and `image/tiff` covers the pickers that filter by
 * MIME rather than by suffix.
 */
export const BULK_IMPORT_ACCEPT = '.pdf,.png,.jpg,.jpeg,.tif,.tiff,image/tiff'

/**
 * Header `BulkImportRequest` reads to learn how many files the client attached.
 *
 * PHP enforces `max_file_uploads` (20 by default) inside the multipart parser,
 * dropping the surplus *before* Laravel sees the request — so a 500-file batch
 * would otherwise come back as an ordinary 202 for 20 documents and the other
 * 480 scans would be gone with no error anywhere. A header is immune to that,
 * because it is not part of the multipart payload the limit applies to.
 *
 * With the count declared, the server can prove a truncation and refuses the
 * whole batch (422 + `upload_truncation`) instead of importing a fragment.
 * Verified live: two files declared as five answers 422 with
 * `{ declared_file_count: 5, received_file_count: 2, discarded_file_count: 3,
 * max_file_uploads: 20, confirmed: true }`.
 */
const EXPECTED_COUNT_HEADER = 'X-Expected-File-Count'

// ---------------------------------------------------------------------------
// Wire shapes (snake_case, exactly as Laravel sends them)
// ---------------------------------------------------------------------------

/** `BulkImportRequest::truncationPayload()`, on both the 202 and the 422 body. */
interface UploadTruncationResource {
  declared_file_count: number | null
  received_file_count: number
  discarded_file_count: number | null
  max_file_uploads: number
  confirmed: boolean
}

/** `BulkImportController::store` — note the key is `documents_queued`, not `count`. */
interface BulkImportResource {
  documents_queued: number
  document_ids: string[]
  /**
   * Present only when the batch landed *exactly* on `max_file_uploads`, which
   * is indistinguishable from a truncated one. The files were imported and the
   * caller is told the count could not be verified — `confirmed: false`.
   */
  upload_truncation?: UploadTruncationResource | null
}

interface BulkImportResponse {
  data: BulkImportResource
}

/** The 422 body a *confirmed* truncation produces — note it sits beside `errors`. */
interface BulkImportTruncationBody {
  upload_truncation?: UploadTruncationResource | null
}

/**
 * `PipelineStatusController::index` returns a bare `pluck('count', 'pipeline_status')`
 * map — an object keyed by status value, with absent keys for empty states.
 */
interface StatusCountsResponse {
  data?: Record<string, number>
}

interface DocumentPipelineStatusResource {
  document_id: string
  pipeline_status: string
  pipeline_status_label: string
  pipeline_error: string | null
  has_ocr_content: boolean
  page_count: number
  has_refinement: boolean
  /**
   * `decimal(5,2)` behind Laravel's `decimal:2` cast, so it arrives as a
   * **string** (`"92.00"`), not a number — and on a 0–100 scale, not 0–1.
   */
  confidence_score: number | string | null
  structured_data: Record<string, unknown> | null
  additional_fields: Record<string, unknown> | null
  /** Misleading name on the wire: the resource fills it with `->count()`. */
  has_embeddings: number
  is_verified: boolean
  verified_by: string | null
  verified_at: string | null
}

interface DocumentPipelineStatusResponse {
  data: DocumentPipelineStatusResource
}

/** Nested resources arrive whole; the controller eager-loads both. */
interface StudentSummaryResource {
  id: string
  student_number: string | null
  name: string | null
}

interface DocumentTypeSummaryResource {
  id: string
  name: string | null
}

interface StudentDocumentResource {
  id: string
  student_id: string | null
  student?: StudentSummaryResource | null
  document_type_id: string | null
  document_type?: DocumentTypeSummaryResource | null
  file_number: string | null
  file_status: string | null
  /**
   * Inlined by `StudentDocumentResource` so a page of rows needs one request,
   * not one per row. `pipeline_status_label` is `PipelineStatus::label()`, and
   * `pipeline_error` is null outside the `failed` state.
   */
  pipeline_status: string | null
  pipeline_status_label: string | null
  pipeline_error: string | null
  notes: string | null
  submitted_at: string | null
  /** Short-lived **signed** URL (`SignsMediaUrls`), absolute; '' becomes null below. */
  file_url: string | null
  file_name: string | null
  created_at: string | null
  updated_at: string | null
}

interface StudentDocumentListResponse {
  data: StudentDocumentResource[]
  meta?: { current_page?: number; last_page?: number; total?: number }
}

// ---------------------------------------------------------------------------
// Mappers — the only place the wire's spelling is allowed to appear
// ---------------------------------------------------------------------------

/**
 * Narrows an unknown wire string onto the status union.
 *
 * A state the frontend has not heard of falls back to `pending` rather than
 * crashing the table: the row still renders, and the API's own Arabic label is
 * displayed beside it, so an operator sees the truth even when this enum is
 * behind the backend's.
 */
function toStatus(raw: string): PipelineStatus {
  return isPipelineStatus(raw) ? raw : 'pending'
}

/**
 * Narrows `confidence_score` onto a plain number.
 *
 * Laravel's `decimal:2` cast serialises the column as a string, so this is the
 * one place the app has to stop treating it as one. The scale is left alone:
 * the stored value is already 0–100 (`RefinementData::fromArray()` multiplies
 * the model's 0–1 answer), and `formatConfidence` expects it that way.
 */
function toConfidence(raw: number | string | null): number | null {
  if (raw === null) return null
  const value = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(value) ? value : null
}

function countsFromResource(resource: Record<string, number> | undefined): PipelineStatusCounts {
  const counts = Object.fromEntries(
    PIPELINE_STATUSES.map((status) => [status, 0]),
  ) as PipelineStatusCounts

  for (const [key, value] of Object.entries(resource ?? {})) {
    if (isPipelineStatus(key)) counts[key] = Number(value) || 0
  }
  return counts
}

function statusFromResource(resource: DocumentPipelineStatusResource): DocumentPipelineStatus {
  return {
    documentId: resource.document_id,
    status: toStatus(resource.pipeline_status),
    statusLabel: resource.pipeline_status_label,
    error: resource.pipeline_error,
    hasOcrContent: resource.has_ocr_content,
    pageCount: resource.page_count ?? 0,
    hasRefinement: resource.has_refinement,
    confidenceScore: toConfidence(resource.confidence_score),
    structuredData: resource.structured_data,
    additionalFields: resource.additional_fields,
    embeddedPageCount: resource.has_embeddings ?? 0,
    isVerified: resource.is_verified,
    verifiedBy: resource.verified_by,
    verifiedAt: resource.verified_at,
  }
}

function documentFromResource(resource: StudentDocumentResource): PipelineDocument {
  return {
    id: resource.id,
    fileNumber: resource.file_number,
    fileStatus: resource.file_status,
    studentId: resource.student_id,
    studentName: resource.student?.name ?? null,
    studentNumber: resource.student?.student_number ?? null,
    documentTypeId: resource.document_type_id,
    documentTypeName: resource.document_type?.name ?? null,
    fileName: resource.file_name,
    // The resource calls `getFirstMediaUrl()`, which returns '' when the
    // document has no media yet. Normalise that to null so callers can just
    // check for a value instead of also testing for the empty string.
    fileUrl: resource.file_url ? resource.file_url : null,
    submittedAt: resource.submitted_at,
    createdAt: resource.created_at,
    pipelineStatus: toStatus(resource.pipeline_status ?? ''),
    pipelineStatusLabel: resource.pipeline_status_label ?? null,
    pipelineError: resource.pipeline_error ?? null,
  }
}

/** camelCase table params -> the `filter[...]` query Spatie QueryBuilder expects. */
function toDocumentQuery(params: ServerTableParams): Record<string, string | number> {
  const query: Record<string, string | number> = {
    page: params.page,
    per_page: params.per_page,
    // Newest first, so a bulk import shows up at the top of the monitor.
    // `created_at` is in the controller's `allowedSorts`.
    sort: '-created_at',
  }

  const fileNumber = params.fileNumber
  if (typeof fileNumber === 'string' && fileNumber.trim()) {
    query['filter[file_number]'] = fileNumber.trim()
  }

  const fileStatus = params.fileStatus
  if (typeof fileStatus === 'string' && fileStatus) {
    query['filter[file_status]'] = fileStatus
  }

  return query
}

// ---------------------------------------------------------------------------

function truncationFromResource(
  resource: UploadTruncationResource | null | undefined,
): UploadTruncation | null {
  if (!resource) return null
  return {
    declaredFileCount: resource.declared_file_count ?? null,
    receivedFileCount: Number(resource.received_file_count) || 0,
    discardedFileCount: resource.discarded_file_count ?? null,
    maxFileUploads: Number(resource.max_file_uploads) || 0,
    confirmed: Boolean(resource.confirmed),
  }
}

/**
 * Thrown when the server proves the batch was cut short and imported nothing.
 *
 * A distinct error type rather than a message: the page has to render four
 * numbers in the operator's own language, and `getApiErrorMessage` can only
 * pass the server's English sentence through.
 */
export class BulkImportTruncatedError extends Error {
  constructor(readonly truncation: UploadTruncation) {
    super('Bulk import was truncated before it reached the server.')
    this.name = 'BulkImportTruncatedError'
  }
}

export interface BulkImportOptions {
  /** Called with 0–100 as the multipart body goes up. */
  onProgress?: (percent: number) => void
  signal?: AbortSignal
}

export const pipelineApi = {
  /**
   * Queues documents for the pipeline. Responds 202 — the files are accepted,
   * not processed; every id in the result starts life as `pending`.
   */
  bulkImport: async (files: File[], options: BulkImportOptions = {}): Promise<BulkImportResult> => {
    const form = new FormData()
    for (const file of files) form.append('files[]', file)

    let data: BulkImportResponse
    try {
      const response = await http.post<BulkImportResponse>(ENDPOINTS.bulkImport, form, {
        // A 500-file batch is far past the client's default 15s budget, and the
        // browser sets its own multipart Content-Type boundary — leave both alone.
        timeout: 0,
        signal: options.signal,
        // Declared out of band so PHP's multipart limit cannot swallow it too.
        headers: { [EXPECTED_COUNT_HEADER]: String(files.length) },
        onUploadProgress: (event) => {
          if (!options.onProgress || !event.total) return
          options.onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)))
        },
      })
      data = response.data
    } catch (err: unknown) {
      // A confirmed truncation is a 422 whose body carries the counts beside
      // the usual `errors` bag. Nothing was imported, so this is not a partial
      // success to report as one.
      if (axios.isAxiosError<BulkImportTruncationBody>(err)) {
        const truncation = truncationFromResource(err.response?.data?.upload_truncation)
        if (truncation?.confirmed) throw new BulkImportTruncatedError(truncation)
      }
      throw err
    }

    return {
      // Carried through so the caller can compare it with the server's tally —
      // see `BulkImportResult.submittedCount`.
      submittedCount: files.length,
      documentsQueued: data.data.documents_queued,
      documentIds: data.data.document_ids ?? [],
      truncation: truncationFromResource(data.data.upload_truncation),
    }
  },

  /** Archive-wide document counts, one entry per pipeline state. */
  statusCounts: async (): Promise<PipelineStatusCounts> => {
    const { data } = await http.get<StatusCountsResponse>(ENDPOINTS.statusCounts)
    return countsFromResource(data.data)
  },

  documentStatus: async (id: string): Promise<DocumentPipelineStatus> => {
    const { data } = await http.get<DocumentPipelineStatusResponse>(ENDPOINTS.documentStatus(id))
    return statusFromResource(data.data)
  },

  /**
   * Re-dispatches a stuck or failed document. Responds 202 with a bare message
   * and no data; a document in any other state comes back 422 from
   * `PipelineRetryRequest`, which the caller surfaces as a toast.
   */
  retry: async (id: string): Promise<void> => {
    await http.post<{ message?: string }>(ENDPOINTS.retry(id))
  },

  /**
   * One page of documents for the monitor, pipeline state included.
   *
   * Verified against the live API: every row carries `pipeline_status`,
   * `pipeline_status_label` and `pipeline_error`, so the monitor renders a page
   * from this one request — the per-row `/pipeline/status/{id}` hydration pass
   * that used to compensate is gone.
   *
   * What the server still cannot do is *filter* by state:
   * `StudentDocumentController::index` allows only `file_number`, `student_id`,
   * `document_type_id` and `file_status`, and Spatie's query builder answers an
   * unknown key with 400 `InvalidFilterQuery` rather than ignoring it — so
   * `filter[pipeline_status]` must never be sent. The monitor narrows the
   * loaded page client-side instead and says so on screen. Add the filter to
   * `toDocumentQuery` the day `allowedFilters` grows an exact
   * `pipeline_status`.
   */
  listDocuments: async (
    params: ServerTableParams,
  ): Promise<ServerTableResponse<PipelineDocument>> => {
    const { data } = await http.get<StudentDocumentListResponse>(ENDPOINTS.documents, {
      params: toDocumentQuery(params),
    })

    return {
      data: (data.data ?? []).map(documentFromResource),
      meta: data.meta ?? {},
    }
  },
}
