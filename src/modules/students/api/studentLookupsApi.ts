import { http } from '@/app/plugins/axios'
import type { LookupOption, PipelineSnapshot } from '../types'

/**
 * Read-only lookups the student screens need from other backend areas.
 *
 * Cross-module imports are forbidden, so this module talks to the academic,
 * location and pipeline endpoints over HTTP itself rather than reaching into
 * `modules/faculties` or a future `modules/locations`.
 */
const FACULTIES_URL = '/v1/academic/faculties'
const PROGRAMS_URL = '/v1/academic/programs'
const DRAWERS_URL = '/v1/location/drawers'
const PIPELINE_STATUS_URL = '/v1/pipeline/status'

interface AcademicResource {
  id: number
  code: string | null
  name_ar: string | null
  name_en: string | null
  status?: string | null
}

interface DrawerResource {
  id: string
  Cabinet?: string | null
  number?: number | null
  label?: string | null
}

interface PaginatedResponse<T> {
  data: T[]
  meta?: { current_page?: number; last_page?: number }
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
    has_embeddings?: number | boolean
    is_verified: boolean
    verified_by: string | null
    verified_at: string | null
  }
}

/**
 * Hard cap on the page-walk below. `FacultyController` and `ProgramController`
 * both call `paginate(10)` with no `per_page` override, so a full option list
 * takes several requests; the cap keeps a mis-reported `last_page` from
 * spinning forever.
 */
const MAX_LOOKUP_PAGES = 20

/** Walks a Laravel-paginated index endpoint and concatenates every page. */
async function fetchAllPages<T>(url: string, params: Record<string, unknown>): Promise<T[]> {
  const collected: T[] = []
  let page = 1
  let lastPage = 1

  do {
    const { data } = await http.get<PaginatedResponse<T>>(url, { params: { ...params, page } })
    collected.push(...data.data)
    lastPage = data.meta?.last_page ?? 1
    page += 1
  } while (page <= lastPage && page <= MAX_LOOKUP_PAGES)

  return collected
}

/** Bilingual label, preferring the active locale and never coming back empty. */
function academicOption(resource: AcademicResource, locale: string): LookupOption {
  const ar = resource.name_ar ?? ''
  const en = resource.name_en ?? ''
  const preferred = locale.startsWith('ar') ? ar : en
  return { value: String(resource.id), label: preferred || en || ar || (resource.code ?? '') }
}

function drawerOption(resource: DrawerResource): LookupOption {
  const slot = resource.label || (resource.number != null ? `#${resource.number}` : '')
  const label = [resource.Cabinet ?? '', slot].filter(Boolean).join(' · ')
  return { value: resource.id, label: label || resource.id }
}

/** `confidence_score` is a decimal column, so it can arrive as a string. */
function toScore(raw: number | string | null): number | null {
  if (raw === null || raw === '') return null
  const value = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(value) ? value : null
}

export const studentLookupsApi = {
  /**
   * Every faculty, as select options in the given locale.
   *
   * Deliberately unfiltered: `filter[status]` is an exact match, so a faculty
   * whose status column holds anything but the expected `active` would vanish
   * from the dropdown — worse than listing one that is inactive.
   */
  faculties: async (locale: string): Promise<LookupOption[]> => {
    const rows = await fetchAllPages<AcademicResource>(FACULTIES_URL, {})
    return rows.map((row) => academicOption(row, locale))
  },

  /** Programs belonging to one faculty — the second half of the cascade. */
  programs: async (facultyId: number | string, locale: string): Promise<LookupOption[]> => {
    const rows = await fetchAllPages<AcademicResource>(PROGRAMS_URL, {
      'filter[faculty_id]': facultyId,
    })
    return rows.map((row) => academicOption(row, locale))
  },

  /**
   * Drawer typeahead for the file-location field. `DrawerController` honours
   * `per_page` (clamped to 100) and filters `label` partially.
   */
  searchDrawers: async (query: string): Promise<LookupOption[]> => {
    const { data } = await http.get<PaginatedResponse<DrawerResource>>(DRAWERS_URL, {
      params: { 'filter[label]': query, per_page: 25 },
    })
    return data.data.map(drawerOption)
  },

  /**
   * AI pipeline state for one document. The student's documents come from
   * `StudentResource`, which carries no pipeline fields, so the detail page
   * asks the pipeline endpoint per document.
   */
  pipelineStatus: async (documentId: string): Promise<PipelineSnapshot> => {
    const { data } = await http.get<PipelineStatusResponse>(`${PIPELINE_STATUS_URL}/${documentId}`)
    return {
      documentId: data.data.document_id,
      status: data.data.pipeline_status ?? 'pending',
      statusLabel: data.data.pipeline_status_label ?? '',
      error: data.data.pipeline_error ?? null,
      hasOcrContent: Boolean(data.data.has_ocr_content),
      pageCount: data.data.page_count ?? 0,
      hasRefinement: Boolean(data.data.has_refinement),
      confidenceScore: toScore(data.data.confidence_score),
      isVerified: Boolean(data.data.is_verified),
      verifiedBy: data.data.verified_by ?? null,
      verifiedAt: data.data.verified_at ?? null,
    }
  },
}
