import { http } from '@/app/plugins/axios'
import {
  PIPELINE_STATUSES,
  type DocumentSegment,
  type LookupOption,
  type PipelineStatusDetail,
  type PipelineStatus,
  type TempUpload,
} from '../types'

/**
 * Everything this module needs from outside its own resource.
 *
 * Cross-module imports are forbidden, so the students, document-type, upload
 * and pipeline endpoints are called over HTTP from here rather than by
 * reaching into another module's api file.
 */
const DOCUMENT_TYPES_URL = '/v1/document-types'
const STUDENTS_URL = '/v1/students'
const UPLOADS_URL = '/v1/uploads'
const PIPELINE_STATUS_URL = '/v1/pipeline/status'
const SEGMENTS_URL = (documentId: string) => `/v1/ai-console/documents/${documentId}/segments`

interface PaginatedResponse<T> {
  data: T[]
  meta?: { current_page?: number; last_page?: number }
}

interface DocumentTypeResource {
  id: string
  name: string | null
  is_required?: boolean
  status?: string | null
}

interface StudentResource {
  id: string
  name: string | null
  student_number: string | null
}

interface TempUploadResponse {
  data: {
    id: string
    original_name: string | null
    mime_type: string | null
    size: number | null
    expires_at: string | null
  }
}

interface PipelineStatusResponse {
  data: {
    document_id: string
    pipeline_status: string | null
    pipeline_status_label: string | null
    pipeline_error: string | null
    has_ocr_content: boolean
    page_count: number
    has_refinement: boolean
    confidence_score: number | string | null
    structured_data: Record<string, unknown> | null
    additional_fields: Record<string, unknown> | null
    has_embeddings: number | boolean
    is_verified: boolean
    verified_by: string | null
    verified_at: string | null
  }
}

interface SegmentResponse {
  data: Array<{
    sequence: number
    page_start: number | null
    page_end: number | null
    detected_type: string | null
    detected_type_ar: string | null
    matched_type: string | null
    confidence: number | string | null
    error: string | null
  }>
}

/** Guards the page-walk below against a mis-reported `last_page`. */
const MAX_LOOKUP_PAGES = 10

/** Upload ceiling: `TempUploadRequest` allows 10 MB, which needs real minutes. */
const UPLOAD_TIMEOUT_MS = 120_000

function toPipelineStatus(raw: string | null): PipelineStatus {
  return PIPELINE_STATUSES.find((status) => status === raw) ?? 'pending'
}

/** Decimal columns can arrive as strings over JSON. */
function toScore(raw: number | string | null): number | null {
  if (raw === null || raw === '') return null
  const value = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(value) ? value : null
}

export const documentLookupsApi = {
  /**
   * Every document type, as select options. `DocumentTypeController` honours
   * `per_page`, so this is normally a single request; the loop only exists for
   * an archive with more than 100 types.
   */
  documentTypes: async (): Promise<LookupOption[]> => {
    const options: LookupOption[] = []
    let page = 1
    let lastPage = 1

    do {
      const { data } = await http.get<PaginatedResponse<DocumentTypeResource>>(DOCUMENT_TYPES_URL, {
        params: { per_page: 100, page, sort: 'name' },
      })
      options.push(...data.data.map((row) => ({ value: row.id, label: row.name ?? row.id })))
      lastPage = data.meta?.last_page ?? 1
      page += 1
    } while (page <= lastPage && page <= MAX_LOOKUP_PAGES)

    return options
  },

  /**
   * Student typeahead for the upload form. `StudentController` filters `name`
   * and `student_number` partially; a query that looks like a number searches
   * both so "1625" finds the student whose number that is.
   */
  searchStudents: async (query: string): Promise<LookupOption[]> => {
    const looksNumeric = /^\d+$/.test(query.trim())
    const params: Record<string, unknown> = { per_page: 20 }
    if (looksNumeric) params['filter[student_number]'] = query.trim()
    else params['filter[name]'] = query.trim()

    const { data } = await http.get<PaginatedResponse<StudentResource>>(STUDENTS_URL, { params })
    return data.data.map((row) => ({
      value: row.id,
      label: [row.name, row.student_number].filter(Boolean).join(' · ') || row.id,
    }))
  },

  /** One student by id, so a `?student=` link can pre-fill the form. */
  student: async (id: string): Promise<LookupOption | null> => {
    const { data } = await http.get<{ data: StudentResource }>(`${STUDENTS_URL}/${id}`)
    if (!data.data) return null
    return {
      value: data.data.id,
      label: [data.data.name, data.data.student_number].filter(Boolean).join(' · ') || data.data.id,
    }
  },

  /**
   * Stages a file and returns the temp-upload id to hand to document create.
   * The record expires after 24 hours, so a form left open overnight has to
   * re-upload. `onProgress` receives 0–100.
   *
   * The shared axios instance times out at 15s, which is fine for JSON and far
   * too short for a 10 MB scan on a branch-office line — the request would be
   * aborted mid-body and read as a failure. Overridden per request rather than
   * on the instance, which belongs to `src/app/` and is not this stream's to
   * change.
   */
  uploadTemp: async (file: File, onProgress?: (percent: number) => void): Promise<TempUpload> => {
    const body = new FormData()
    body.append('file', file)

    const { data } = await http.post<TempUploadResponse>(UPLOADS_URL, body, {
      timeout: UPLOAD_TIMEOUT_MS,
      onUploadProgress: (event) => {
        if (!onProgress || !event.total) return
        onProgress(Math.round((event.loaded / event.total) * 100))
      },
    })

    return {
      id: data.data.id,
      originalName: data.data.original_name ?? file.name,
      mimeType: data.data.mime_type ?? file.type,
      size: data.data.size ?? file.size,
      expiresAt: data.data.expires_at ?? null,
    }
  },

  /** Discards a staged file the user backed out of. */
  discardTemp: async (id: string): Promise<void> => {
    await http.delete(`${UPLOADS_URL}/${id}`)
  },

  /** Where one document has got to in the OCR → refinement → embedding pipeline. */
  pipelineStatus: async (documentId: string): Promise<PipelineStatusDetail> => {
    const { data } = await http.get<PipelineStatusResponse>(`${PIPELINE_STATUS_URL}/${documentId}`)
    return {
      documentId: data.data.document_id,
      status: toPipelineStatus(data.data.pipeline_status),
      statusLabel: data.data.pipeline_status_label ?? '',
      error: data.data.pipeline_error ?? null,
      hasOcrContent: Boolean(data.data.has_ocr_content),
      pageCount: data.data.page_count ?? 0,
      hasRefinement: Boolean(data.data.has_refinement),
      confidenceScore: toScore(data.data.confidence_score),
      structuredData: data.data.structured_data ?? null,
      additionalFields: data.data.additional_fields ?? null,
      // `has_embeddings` is a COUNT of pages with an embedding, not a boolean.
      embeddedPages: Number(data.data.has_embeddings ?? 0) || 0,
      isVerified: Boolean(data.data.is_verified),
      verifiedBy: data.data.verified_by ?? null,
      verifiedAt: data.data.verified_at ?? null,
    }
  },

  /**
   * The individual documents the AI detected inside a scanned bundle.
   *
   * `DocumentPipelineStatusResource` does not expose segments, so this reads
   * the AI-console endpoint instead — the only one that returns them. It is a
   * prompt-engineering surface, so callers must treat a failure here as
   * "no segment view available" rather than an error worth reporting.
   *
   * The field list below is `AiConsoleController@storedSegments`' own `map`,
   * key for key — it hand-rolls the response rather than using a Resource.
   */
  segments: async (documentId: string): Promise<DocumentSegment[]> => {
    const { data } = await http.get<SegmentResponse>(SEGMENTS_URL(documentId))
    return (data.data ?? []).map((row) => ({
      sequence: row.sequence,
      pageStart: row.page_start ?? null,
      pageEnd: row.page_end ?? null,
      detectedType: row.detected_type ?? null,
      detectedTypeAr: row.detected_type_ar ?? null,
      matchedType: row.matched_type ?? null,
      confidence: toScore(row.confidence),
      error: row.error ?? null,
    }))
  },
}
