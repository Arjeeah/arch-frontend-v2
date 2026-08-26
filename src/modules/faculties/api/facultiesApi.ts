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

// Verified: `status` is a lowercase string on the wire ('active' / 'inactive'),
// and the write side is just as strict — `StoreFacultyRequest` validates
// `in:active,inactive`, so posting a capitalised 'Active' answers
// `422 {"status":["The selected status is invalid."]}`. `toPayload` lowercases
// for exactly that reason. The read comparison stays case-insensitive anyway.
function toStatus(raw: string): FacultyStatus {
  return raw.toLowerCase() === 'active' ? 'Active' : 'Inactive'
}

/**
 * snake_case wire format -> camelCase UI model.
 *
 * Verified against the running API: `App\Http\Resources\FacultyResource` never
 * emits a `programs` relation or count, so there is no server-provided number to
 * map — deriving one would cost an extra
 * `/v1/academic/programs?filter[faculty_id]=…` request per row. Mapped to `null`
 * ("unknown"), not `0` — `0` would be a number the API never sent, displayed as
 * fact.
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
   * Verified: `index()` hardcodes `->paginate(10)` and ignores `per_page` —
   * `?per_page=100` still answers `meta.per_page = 10`. `useServerTable` trusts
   * the response `meta` regardless, so this only matters if a page-size selector
   * is ever added. Filters must be nested (`filter[name_en]=…`); a flat
   * `?name_en=…` is silently ignored and returns the unfiltered list, which is
   * why `FacultyListPage` hands this a pre-nested `filter` object.
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
   * Restores a soft-deleted faculty. Verified end to end against the running
   * API: `DELETE` answers 204 and the row drops out of both `index` and `show`
   * (404), then `POST …/restore` answers `200 { data, message }` and brings it
   * back. Not surfaced in the UI yet: the index endpoint does not return trashed
   * rows, so there is nothing to restore *from*.
   */
  restore: async (id: number): Promise<Faculty> => {
    const { data } = await http.post<FacultyItemResponse>(API_ENDPOINTS.faculties.restore(id))
    return fromResource(data.data)
  },
}
