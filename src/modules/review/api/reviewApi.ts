import { http } from '@/app/plugins/axios'
import type { ServerTableParams, ServerTableResponse } from '@/shared/composables/useServerTable'
import type {
  CorrectionResult,
  LookupOption,
  RefinementIdentity,
  RefinementSnapshot,
  ReviewQueueItem,
  VerificationResult,
} from '../types'

/**
 * Endpoints this module owns. They live here rather than in
 * `src/app/config/api.ts` because a feature module may not edit app-level
 * config — the module boundary rule cuts both ways.
 */
const ENDPOINTS = {
  reviewQueue: '/v1/pipeline/review-queue',
  refinement: (id: string) => `/v1/refinements/${id}`,
  verifyRefinement: (id: string) => `/v1/refinements/${id}/verify`,
  faculties: '/v1/academic/faculties',
  documentTypes: '/v1/document-types',
} as const

/* ------------------------------------------------------------------ *
 * Wire types — snake_case, matching the Laravel resources exactly.
 * ------------------------------------------------------------------ */

/** `RefinementData::toArray()` — the shape stored in both data columns. */
interface RefinementDataResource {
  student_number?: string | null
  student_name?: string | null
  college?: string | null
  program?: string | null
  document_type?: string | null
  enrollment_date?: string | null
  /** 0–100 float, already scaled up from the model's 0–1 output. */
  confidence?: number | string | null
  additional_fields?: Record<string, unknown> | null
}

/** `ReviewQueueResource` — wraps a StudentDocument with its refinement. */
interface ReviewQueueItemResource {
  document_id: string
  /**
   * NOT sent by `ReviewQueueResource` today — confirmed against the source, not
   * assumed. `PATCH /v1/refinements/{refinement}` and its verify sibling bind
   * `DocumentRefinement` by `document_refinements.id`, and no endpoint in the
   * API emits that id: the queue resource exposes only `document_id`
   * (`student_documents.id`).
   *
   * The mapper used to substitute `document_id` here, which guaranteed a 404 on
   * every save and every verify. It maps to `null` instead, and the page
   * disables both write actions with an explanation rather than issuing a
   * request that cannot succeed. Adding `'refinement_id' => $refinement?->id`
   * to the resource is a one-line backend change and lights the screen up with
   * no further edit here. Tracked in WIRING.md → Still outstanding.
   */
  refinement_id?: string | null
  file_number?: string | null
  file_name?: string | null
  /** `getFirstMediaUrl()` returns `''`, not null, when there is no file. */
  file_url?: string | null
  pipeline_status: string
  pipeline_status_label: string
  /** `decimal:2` cast — Laravel serialises it as a string like `"83.00"`. */
  confidence_score?: number | string | null
  structured_data?: RefinementDataResource | null
  verified_data?: RefinementDataResource | null
  verified_by?: string | null
  verified_at?: string | null
  created_at?: string | null
}

interface PaginationMetaResource {
  current_page?: number
  last_page?: number
  total?: number
  per_page?: number
}

interface ReviewQueueListResponse {
  data: ReviewQueueItemResource[]
  meta?: PaginationMetaResource
}

/** `PATCH /v1/refinements/{id}` → `{ message, data: {...} }`. */
interface CorrectionResponse {
  data: {
    verified_data?: RefinementDataResource | null
    verified_by?: string | null
    verified_at?: string | null
  }
}

/** `POST /v1/refinements/{id}/verify` → `{ message, data: {...} }`. */
interface VerificationResponse {
  data: {
    verified_by?: string | null
    verified_at?: string | null
  }
}

interface FacultyResource {
  id: number
  name_ar: string
  name_en: string
}

interface FacultyListResponse {
  data: FacultyResource[]
  meta?: PaginationMetaResource
}

/**
 * `DocumentTypeResource` — note it exposes `name` only, no Arabic name.
 * `DocumentType` uses `HasUuids`, so the id is a string (unlike `Faculty`).
 */
interface DocumentTypeResource {
  id: string
  name: string
}

interface DocumentTypeListResponse {
  data: DocumentTypeResource[]
}

/* ------------------------------------------------------------------ *
 * Mappers — wire -> UI model and back.
 * ------------------------------------------------------------------ */

/** Laravel sends `decimal` casts as strings; everything else may be a number. */
function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** Null-safe string coercion — the form binds to strings, never to null. */
function toText(value: string | null | undefined): string {
  return value ?? ''
}

function snapshotFromResource(resource: RefinementDataResource | null | undefined) {
  if (!resource) return null
  const snapshot: RefinementSnapshot = {
    studentNumber: toText(resource.student_number),
    studentName: toText(resource.student_name),
    college: toText(resource.college),
    program: toText(resource.program),
    documentType: toText(resource.document_type),
    enrollmentDate: toText(resource.enrollment_date),
    confidence: toNumber(resource.confidence),
    additionalFields: resource.additional_fields ?? {},
  }
  return snapshot
}

/** snake_case wire row -> camelCase UI model. */
function fromResource(resource: ReviewQueueItemResource): ReviewQueueItem {
  const fileUrl = toText(resource.file_url)

  return {
    documentId: resource.document_id,
    // No fallback to `document_id`: see the note above — it addressed the
    // wrong table and turned every write into a 404.
    refinementId: resource.refinement_id ?? null,
    fileNumber: resource.file_number ?? null,
    fileName: resource.file_name ?? null,
    fileUrl: fileUrl === '' ? null : fileUrl,
    pipelineStatus: resource.pipeline_status,
    pipelineStatusLabel: resource.pipeline_status_label,
    confidenceScore: toNumber(resource.confidence_score),
    structuredData: snapshotFromResource(resource.structured_data),
    verifiedData: snapshotFromResource(resource.verified_data),
    verifiedBy: resource.verified_by ?? null,
    verifiedAt: resource.verified_at ?? null,
    createdAt: resource.created_at ?? null,
  }
}

/**
 * camelCase UI model -> request body.
 *
 * **The one endpoint in the API that does not speak snake_case.**
 * `UpdateRefinementRequest` validates `studentNumber` / `studentName` /
 * `documentType` / `enrollmentDate` / `additionalFields` and the controller
 * converts to snake_case itself. Sending snake_case here means every rule is
 * skipped (they are all `sometimes`), the corrections never reach
 * `RefinementData`, and the row is marked verified with the AI's answer
 * untouched — a silent data-quality failure. Do not "fix" this to snake_case.
 *
 * Only the keys the reviewer actually changed are sent: the controller merges
 * them over `structured_data`, so an omitted key keeps the AI's value.
 */
function toPayload(corrections: Partial<RefinementIdentity>): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  if (corrections.studentNumber !== undefined) payload.studentNumber = corrections.studentNumber
  if (corrections.studentName !== undefined) payload.studentName = corrections.studentName
  if (corrections.college !== undefined) payload.college = corrections.college
  if (corrections.program !== undefined) payload.program = corrections.program
  if (corrections.documentType !== undefined) payload.documentType = corrections.documentType
  if (corrections.enrollmentDate !== undefined) payload.enrollmentDate = corrections.enrollmentDate
  if (corrections.additionalFields !== undefined) {
    payload.additionalFields = corrections.additionalFields
  }
  return payload
}

/**
 * Drops empty query params.
 *
 * `RefinementController::reviewQueue` filters on `$request->has('below_confidence')`,
 * and `has()` is true for an empty string — which would cast to `0.0` and hide
 * every row. Clearing the filter has to remove the key, not blank it.
 */
function cleanParams(params: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    cleaned[key] = value
  }
  return cleaned
}

/* ------------------------------------------------------------------ *
 * Calls
 * ------------------------------------------------------------------ */

export const reviewApi = {
  /**
   * One page of the review queue, worst confidence first.
   *
   * // verify against live API: the controller calls `->paginate()` with no
   * argument, so `per_page` is ignored and the server always returns 15 rows.
   * Pagination still tracks correctly because `useServerTable` trusts the
   * server's `meta` over its own `perPage`.
   */
  queue: async (params: ServerTableParams): Promise<ServerTableResponse<ReviewQueueItem>> => {
    const { data } = await http.get<ReviewQueueListResponse>(ENDPOINTS.reviewQueue, {
      params: cleanParams(params),
    })
    return {
      data: (data.data ?? []).map(fromResource),
      meta: data.meta ?? {},
    }
  },

  /** Accept the extraction with corrections. Sends **camelCase** — see `toPayload`. */
  saveCorrections: async (
    refinementId: string,
    corrections: Partial<RefinementIdentity>,
  ): Promise<CorrectionResult> => {
    const { data } = await http.patch<CorrectionResponse>(
      ENDPOINTS.refinement(refinementId),
      toPayload(corrections),
    )
    return {
      verifiedData: snapshotFromResource(data.data?.verified_data),
      verifiedBy: data.data?.verified_by ?? null,
      verifiedAt: data.data?.verified_at ?? null,
    }
  },

  /** Accept the extraction exactly as the AI produced it. */
  verify: async (refinementId: string): Promise<VerificationResult> => {
    const { data } = await http.post<VerificationResponse>(ENDPOINTS.verifyRefinement(refinementId))
    return {
      verifiedBy: data.data?.verified_by ?? null,
      verifiedAt: data.data?.verified_at ?? null,
    }
  },

  /**
   * Faculty names for the college select.
   *
   * The stored `college` is the faculty *name*, not an id, so the option value
   * is the Arabic name — the language the extractor is prompted to answer in.
   *
   * // verify against live API: `FacultyController::index` hard-codes
   * `->paginate(10)` and ignores `per_page`, so the remaining pages are pulled
   * explicitly (capped, since this is a lookup and not a browse).
   */
  listFaculties: async (locale: string): Promise<LookupOption[]> => {
    const MAX_PAGES = 5
    const label = (faculty: FacultyResource) =>
      (locale === 'ar' ? faculty.name_ar : faculty.name_en) || faculty.name_ar || faculty.name_en

    const first = await http.get<FacultyListResponse>(ENDPOINTS.faculties, {
      params: { per_page: 100 },
    })
    const rows = [...(first.data.data ?? [])]

    const lastPage = Math.min(first.data.meta?.last_page ?? 1, MAX_PAGES)
    if (lastPage > 1) {
      const pages = Array.from({ length: lastPage - 1 }, (_, i) => i + 2)
      const rest = await Promise.all(
        pages.map((page) =>
          http.get<FacultyListResponse>(ENDPOINTS.faculties, { params: { page, per_page: 100 } }),
        ),
      )
      for (const response of rest) rows.push(...(response.data.data ?? []))
    }

    // The Arabic name is the option's value because that is what the extractor
    // writes into `college`; `name_en` only stands in when a record has no
    // Arabic name, so that faculty stays selectable instead of vanishing.
    return rows
      .map((faculty) => ({ value: faculty.name_ar || faculty.name_en, label: label(faculty) }))
      .filter((option) => Boolean(option.value))
  },

  /**
   * Document type names for the type select. `DocumentTypeResource` exposes the
   * English `name` only, which is also what the extractor is asked to return.
   */
  listDocumentTypes: async (): Promise<LookupOption[]> => {
    const { data } = await http.get<DocumentTypeListResponse>(ENDPOINTS.documentTypes, {
      params: { per_page: 100 },
    })
    return (data.data ?? [])
      .filter((type) => Boolean(type.name))
      .map((type) => ({ value: type.name, label: type.name }))
  },
}
