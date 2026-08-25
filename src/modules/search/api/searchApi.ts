import { http } from '@/app/plugins/axios'
import { API_ENDPOINTS } from '@/app/config/api'
import type {
  LookupOption,
  SearchMeta,
  SearchMode,
  SearchQueryInput,
  SearchResponse,
  SearchResult,
} from '../types'

/**
 * `POST /v1/search` — hybrid semantic + keyword search.
 *
 * Declared here rather than in `src/app/config/api.ts`: that file belongs to the
 * app shell, and this module owns its own endpoint until the integrator chooses
 * to lift it. See WIRING.md.
 */
const SEARCH_ENDPOINT = '/v1/search'

/**
 * Safety valve for the lookup loops below. The academic endpoints hard-code
 * `paginate(10)` and ignore `per_page`, so a full list has to be walked page by
 * page; 20 pages (200 rows) is far past any realistic faculty/program count and
 * stops a bad `last_page` from spinning the browser.
 */
const MAX_LOOKUP_PAGES = 20

// ── Wire shapes (snake_case, exactly as Laravel sends them) ─────────────────

/** `App\Http\Resources\Pipeline\SearchResultResource`. */
interface SearchResultResource {
  content_id: number
  student_document_id: number
  content: string | null
  page_number: number | null
  file_number: string | null
  student_id: number | null
  student_name: string | null
  student_number: string | null
  faculty_name: string | null
  program_name: string | null
  /**
   * verify against live API: the controller rounds a Postgres numeric, which
   * PDO can surface as a string. Accepting both and coercing keeps a stringy
   * score from rendering a zero-width bar.
   */
  similarity_score: number | string | null
}

/** The `additional(['meta' => …])` block on the search response. */
interface SearchMetaResource {
  search_mode: string
  query: string
  total_results: number
  fallback_reason: string | null
}

interface SearchResponseBody {
  data: SearchResultResource[]
  meta: SearchMetaResource
}

/** Request body accepted by `SearchRequest`. */
interface SearchPayload {
  query: string
  limit?: number
  filters?: {
    faculty_id?: number
    program_id?: number
    student_status?: string
  }
}

/** `FacultyResource` / `ProgramResource` — only the fields the selects need. */
interface AcademicResource {
  id: number
  name_ar: string | null
  name_en: string | null
  /** Programs only: eager-loaded on the index endpoint. */
  faculty?: { id: number } | null
}

interface PaginatedBody<T> {
  data: T[]
  meta?: { current_page?: number; last_page?: number }
}

// ── Mappers ────────────────────────────────────────────────────────────────

function toNumberOrNull(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** Narrows the wire string onto the `SearchMode` union. */
function toMode(raw: string): SearchMode {
  return raw === 'keyword' ? 'keyword' : 'semantic'
}

function resultFromResource(resource: SearchResultResource): SearchResult {
  return {
    contentId: resource.content_id,
    studentDocumentId: resource.student_document_id,
    content: resource.content ?? '',
    pageNumber: toNumberOrNull(resource.page_number),
    fileNumber: resource.file_number,
    studentId: toNumberOrNull(resource.student_id),
    studentName: resource.student_name,
    studentNumber: resource.student_number,
    facultyName: resource.faculty_name,
    programName: resource.program_name,
    similarityScore: toNumberOrNull(resource.similarity_score) ?? 0,
  }
}

function metaFromResource(
  resource: SearchMetaResource | undefined,
  fallbackCount: number,
): SearchMeta {
  return {
    mode: toMode(resource?.search_mode ?? 'semantic'),
    query: resource?.query ?? '',
    totalResults: resource?.total_results ?? fallbackCount,
    fallbackReason: resource?.fallback_reason ?? null,
  }
}

/** camelCase UI model -> snake_case request body. Empty filters are dropped. */
function toPayload(input: SearchQueryInput): SearchPayload {
  const payload: SearchPayload = { query: input.query.trim() }

  if (input.limit !== undefined) payload.limit = input.limit

  const filters: NonNullable<SearchPayload['filters']> = {}
  if (input.filters?.facultyId != null) filters.faculty_id = input.filters.facultyId
  if (input.filters?.programId != null) filters.program_id = input.filters.programId
  if (input.filters?.studentStatus) filters.student_status = input.filters.studentStatus

  // `filters` is `sometimes|array` server-side — omit it entirely rather than
  // sending an empty object, so the query reads the same in the API logs.
  if (Object.keys(filters).length > 0) payload.filters = filters

  return payload
}

function lookupFromResource(resource: AcademicResource): LookupOption {
  const nameAr = resource.name_ar ?? resource.name_en ?? String(resource.id)
  const nameEn = resource.name_en ?? nameAr
  return {
    id: resource.id,
    nameAr,
    nameEn,
    facultyId: resource.faculty?.id ?? null,
  }
}

/**
 * Walks every page of a Laravel-paginated index. Used only for the two small
 * lookup lists that feed the filter selects — never for result sets, which stay
 * bounded by the search `limit`.
 */
async function fetchAllPages(
  url: string,
  params: Record<string, string | number> = {},
): Promise<AcademicResource[]> {
  const rows: AcademicResource[] = []
  let page = 1
  let lastPage = 1

  do {
    const { data } = await http.get<PaginatedBody<AcademicResource>>(url, {
      params: { ...params, page },
    })
    rows.push(...(data.data ?? []))
    lastPage = data.meta?.last_page ?? 1
    page += 1
  } while (page <= lastPage && page <= MAX_LOOKUP_PAGES)

  return rows
}

// ── Public API ─────────────────────────────────────────────────────────────

export const searchApi = {
  /**
   * Runs a search. Never paginated: the endpoint returns at most `limit` rows
   * (default 20, max 100) in one shot, so there is no `page`/`per_page` to hand
   * to `useServerTable`.
   */
  search: async (input: SearchQueryInput): Promise<SearchResponse> => {
    const { data } = await http.post<SearchResponseBody>(SEARCH_ENDPOINT, toPayload(input))
    const results = (data.data ?? []).map(resultFromResource)
    return { results, meta: metaFromResource(data.meta, results.length) }
  },

  /** Faculties for the filter select. */
  faculties: async (): Promise<LookupOption[]> => {
    const rows = await fetchAllPages(API_ENDPOINTS.faculties.list)
    return rows.map(lookupFromResource)
  },

  /**
   * Programs for the filter select, optionally narrowed to one faculty.
   * `ProgramController` allows an exact `faculty_id` filter through
   * spatie/laravel-query-builder, hence the `filter[…]` parameter spelling.
   */
  programs: async (facultyId?: number | null): Promise<LookupOption[]> => {
    const params: Record<string, string | number> = {}
    if (facultyId != null) params['filter[faculty_id]'] = facultyId
    const rows = await fetchAllPages(API_ENDPOINTS.programs.list, params)
    return rows.map(lookupFromResource)
  },
}
