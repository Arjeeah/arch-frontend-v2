import { http } from '@/app/plugins/axios'
import { API_ENDPOINTS } from '@/app/config/api'
import type { Program, ProgramFacultySummary, ProgramInput, ProgramStatus } from '../types'

/** A faculty nested on `ProgramResource` (snake_case, subset of `FacultyResource`). */
interface FacultyResourceLite {
  id: number
  code: string
  name_ar: string
  name_en: string
}

/** A program exactly as `ProgramResource` sends it (snake_case). */
interface ProgramResource {
  id: number
  code: string
  /**
   * `whenLoaded('faculty')` — present on `index` (the controller calls
   * `->with('faculty')`), but `store`/`update` return the model straight
   * from `Program::create()`/`update()` with no eager load, so this key can
   * be entirely absent there rather than `null`.
   * // verify against live API: confirm store/update responses either omit
   * // the key or resolve it consistently once the backend is reachable.
   */
  faculty?: FacultyResourceLite | null
  name_ar: string
  name_en: string
  status: string
  created_at: string
  updated_at: string
}

/** `show` / `store` / `update` responses are wrapped in a single `data` key. */
interface ProgramItemResponse {
  data: ProgramResource
}

/** `index` is paginated: `{ data: [...], meta, links }`. */
interface ProgramListResponse {
  data: ProgramResource[]
  meta?: { last_page?: number; current_page?: number; total?: number }
}

export interface ProgramListParams {
  page?: number
  /**
   * `ProgramController::index()` hardcodes `->paginate(10)` — it ignores
   * whatever `per_page` is sent. Kept in the type (and sent by
   * `useServerTable`) so the call site does not need special-casing; the
   * backend just discards it.
   */
  per_page?: number
  /** `AllowedFilter::partial('name_ar')`. */
  name_ar?: string
  /** `AllowedFilter::partial('name_en')`. */
  name_en?: string
  status?: ProgramStatus
  faculty_id?: number
}

/**
 * Spatie QueryBuilder only reads filters out of a nested `filter` query
 * parameter — `?filter[name_ar]=x`, never a bare `?name_ar=x`, which it
 * silently ignores (`config/query-builder.php` sets
 * `parameters.filter => 'filter'`, and the backend's own tests hit
 * `/api/v1/academic/programs?filter[faculty_id]=…`).
 *
 * The nesting lives here rather than at the call site so the page can keep
 * handing `useServerTable` plain `{ name_ar, status, faculty_id }` filters —
 * `setFilters` merges per key, which a pre-nested `filter` object would break
 * by replacing the whole group on every change. Axios serialises the nested
 * object back into `filter[name_ar]=x` on the wire.
 */
function toQuery({ page, per_page, ...filters }: ProgramListParams): Record<string, unknown> {
  const filter: Record<string, string> = {}
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') filter[key] = String(value)
  }
  return Object.keys(filter).length > 0 ? { page, per_page, filter } : { page, per_page }
}

function toFacultySummary(
  resource: FacultyResourceLite | null | undefined,
): ProgramFacultySummary | null {
  if (!resource) return null
  return {
    id: resource.id,
    code: resource.code,
    nameAr: resource.name_ar,
    nameEn: resource.name_en,
  }
}

function toStatus(raw: string): ProgramStatus {
  return raw === 'inactive' ? 'inactive' : 'active'
}

/** snake_case wire format -> camelCase UI model. */
function fromResource(resource: ProgramResource): Program {
  const faculty = toFacultySummary(resource.faculty)
  return {
    id: resource.id,
    // Deliberately `null`, not a `0` sentinel: the wire has no `faculty_id`
    // column, so an absent relation means "unknown here", and `0` would sail
    // through the edit dialog's required check and POST an id that cannot exist.
    facultyId: faculty?.id ?? null,
    faculty,
    code: resource.code,
    nameAr: resource.name_ar,
    nameEn: resource.name_en,
    status: toStatus(resource.status),
    createdAt: resource.created_at,
    updatedAt: resource.updated_at,
  }
}

/** camelCase UI model -> snake_case request payload. */
function toPayload(input: Partial<ProgramInput>): Record<string, string | number> {
  const payload: Record<string, string | number> = {}
  if (input.facultyId !== undefined) payload.faculty_id = input.facultyId
  if (input.code !== undefined) payload.code = input.code
  if (input.nameAr !== undefined) payload.name_ar = input.nameAr
  if (input.nameEn !== undefined) payload.name_en = input.nameEn
  if (input.status !== undefined) payload.status = input.status
  return payload
}

export const programsApi = {
  list: async (
    params: ProgramListParams,
  ): Promise<{ data: Program[]; meta: ProgramListResponse['meta'] }> => {
    const { data } = await http.get<ProgramListResponse>(API_ENDPOINTS.programs.list, {
      params: toQuery(params),
    })
    return { data: data.data.map(fromResource), meta: data.meta }
  },

  show: async (id: number): Promise<Program> => {
    const { data } = await http.get<ProgramItemResponse>(API_ENDPOINTS.programs.show(id))
    return fromResource(data.data)
  },

  create: async (input: ProgramInput): Promise<Program> => {
    const { data } = await http.post<ProgramItemResponse>(
      API_ENDPOINTS.programs.create,
      toPayload(input),
    )
    return fromResource(data.data)
  },

  update: async (id: number, input: Partial<ProgramInput>): Promise<Program> => {
    const { data } = await http.put<ProgramItemResponse>(
      API_ENDPOINTS.programs.update(id),
      toPayload(input),
    )
    return fromResource(data.data)
  },

  /** Soft-deletes the program; `restore` below can bring it back. */
  delete: async (id: number): Promise<void> => {
    await http.delete(API_ENDPOINTS.programs.delete(id))
  },

  /**
   * `POST /v1/academic/programs/{id}/restore` — not in the shared
   * `API_ENDPOINTS` map (that file is outside this module's territory), so
   * the path is hardcoded here, same pattern as `facultiesApi.restore`. Not
   * surfaced in the UI yet: the index endpoint never returns trashed rows,
   * so there is nothing to restore from — kept for parity with the faculties
   * module and for the day a "trashed" view exists.
   */
  restore: async (id: number): Promise<Program> => {
    const { data } = await http.post<ProgramItemResponse>(`/v1/academic/programs/${id}/restore`)
    return fromResource(data.data)
  },
}

/** Hard cap on the lookup's paging loop — 10 pages of 10 is far more than the ~9 real faculties. */
const FACULTY_LOOKUP_MAX_PAGES = 10

interface FacultyListResponse {
  data: FacultyResourceLite[]
  meta?: { last_page?: number; current_page?: number }
}

/**
 * Own-territory lookup for the faculty filter/select — programs cannot import
 * the `faculties` module (cross-module imports are forbidden), so it hits
 * `/v1/academic/faculties` directly.
 *
 * `FacultyController::index()` hardcodes `->paginate(10)` and ignores
 * `per_page`, so a single request can never return more than ten faculties no
 * matter what is asked for. Nine exist today, which is exactly the kind of
 * off-by-one that turns into a silently truncated dropdown the day a tenth is
 * added — so this walks the pages instead, bounded by
 * `FACULTY_LOOKUP_MAX_PAGES`. If the list ever grows past that, swap the
 * select for `AppAsyncSelect` rather than raising the cap.
 */
export const facultyLookupApi = {
  listOptions: async (): Promise<{ value: string; label: string }[]> => {
    const faculties: FacultyResourceLite[] = []
    let page = 1
    let lastPage = 1

    do {
      const { data } = await http.get<FacultyListResponse>(API_ENDPOINTS.faculties.list, {
        params: { page },
      })
      faculties.push(...data.data)
      lastPage = data.meta?.last_page ?? 1
      page += 1
    } while (page <= lastPage && page <= FACULTY_LOOKUP_MAX_PAGES)

    return faculties.map((faculty) => ({
      value: String(faculty.id),
      label: `${faculty.name_ar} — ${faculty.name_en}`,
    }))
  },
}
