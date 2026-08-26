import { http } from '@/app/plugins/axios'
import { API_ENDPOINTS } from '@/app/config/api'
import type { Faculty, FacultyInput, FacultyStatus } from '../types'
import type { ServerTableParams, ServerTableResponse } from '@/shared/composables/useServerTable'

/** A faculty exactly as the backend sends it (Laravel resource, snake_case). */
interface FacultyResource {
  id: number
  code: string
  name_ar: string
  name_en: string
  status: string
}

/** `show` / `store` / `update` responses are wrapped in a single `data` key. */
interface FacultyItemResponse {
  data: FacultyResource
}

/** `index` is paginated: `{ data: [...], meta, links }`. */
interface FacultyListResponse {
  data: FacultyResource[]
  meta?: { current_page?: number; last_page?: number; total?: number }
}

// verify against live API: assumes the backend stores status as a lowercase
// string ('active' / 'inactive'). Comparison is case-insensitive so a
// capitalised value would still map correctly.
function toStatus(raw: string): FacultyStatus {
  return raw.toLowerCase() === 'active' ? 'Active' : 'Inactive'
}

/**
 * snake_case wire format -> camelCase UI model.
 *
 * verify against live API: `App\Http\Resources\FacultyResource` never emits a
 * `programs` relation, so there is no server-provided count to map — the
 * dedicated `/v1/academic/programs?filter[faculty_id]=` endpoint would need
 * an extra request per row to derive one. Mapped to `null` ("unknown"), not
 * `0` — `0` would be a number the API never sent, displayed as fact.
 */
function fromResource(resource: FacultyResource): Faculty {
  return {
    id: resource.id,
    code: resource.code,
    nameAR: resource.name_ar,
    nameEN: resource.name_en,
    status: toStatus(resource.status),
    programsCount: null,
  }
}

/** camelCase UI model -> snake_case request payload. */
function toPayload(input: Partial<FacultyInput>): Record<string, string> {
  const payload: Record<string, string> = {}
  if (input.code !== undefined) payload.code = input.code
  if (input.nameAR !== undefined) payload.name_ar = input.nameAR
  if (input.nameEN !== undefined) payload.name_en = input.nameEN
  if (input.status !== undefined) payload.status = input.status.toLowerCase()
  return payload
}

export const facultiesApi = {
  /**
   * One page of faculties for `useServerTable`. Filters map to the
   * allowlisted `Spatie\QueryBuilder` filters on
   * `Academic\FacultyController::index` (`filter[name_ar|name_en|status]`).
   *
   * verify against live API: `index()` hardcodes `->paginate(10)` and ignores
   * `per_page` — `useServerTable` trusts the response `meta` regardless, so
   * this only matters if a page-size selector is ever added.
   */
  list: async (params: ServerTableParams): Promise<ServerTableResponse<Faculty>> => {
    const { data } = await http.get<FacultyListResponse>(API_ENDPOINTS.faculties.list, { params })
    return {
      data: data.data.map(fromResource),
      meta: data.meta ?? {},
    }
  },

  show: async (id: number): Promise<Faculty> => {
    const { data } = await http.get<FacultyItemResponse>(API_ENDPOINTS.faculties.show(id))
    return fromResource(data.data)
  },

  create: async (input: FacultyInput): Promise<Faculty> => {
    const { data } = await http.post<FacultyItemResponse>(
      API_ENDPOINTS.faculties.create,
      toPayload(input),
    )
    return fromResource(data.data)
  },

  update: async (id: number, input: Partial<FacultyInput>): Promise<Faculty> => {
    const { data } = await http.put<FacultyItemResponse>(
      API_ENDPOINTS.faculties.update(id),
      toPayload(input),
    )
    return fromResource(data.data)
  },

  /** Soft-deletes the faculty; it can be brought back with `restore`. */
  delete: async (id: number): Promise<void> => {
    await http.delete(API_ENDPOINTS.faculties.delete(id))
  },

  /**
   * Restores a soft-deleted faculty. Not surfaced in the UI yet: the index
   * endpoint does not return trashed rows, so there is nothing to restore from.
   */
  restore: async (id: number): Promise<Faculty> => {
    const { data } = await http.post<FacultyItemResponse>(API_ENDPOINTS.faculties.restore(id))
    return fromResource(data.data)
  },
}
