import { http } from '@/app/plugins/axios'
import { API_ENDPOINTS } from '@/app/config/api'
import type { Faculty, FacultyInput, FacultyStatus } from '../types'

/** A faculty exactly as the backend sends it (Laravel resource, snake_case). */
interface FacultyResource {
  id: number
  code: string
  name_ar: string
  name_en: string
  status: string
  programs?: unknown[]
}

/** `show` / `store` / `update` responses are wrapped in a single `data` key. */
interface FacultyItemResponse {
  data: FacultyResource
}

/** `index` is paginated: `{ data: [...], meta, links }`. */
interface FacultyListResponse {
  data: FacultyResource[]
}

// verify against live API: assumes the backend stores status as a lowercase
// string ('active' / 'inactive'). Comparison is case-insensitive so a
// capitalised value would still map correctly.
function toStatus(raw: string): FacultyStatus {
  return raw.toLowerCase() === 'active' ? 'Active' : 'Inactive'
}

/** snake_case wire format -> camelCase UI model. */
function fromResource(resource: FacultyResource): Faculty {
  return {
    id: resource.id,
    code: resource.code,
    nameAR: resource.name_ar,
    nameEN: resource.name_en,
    status: toStatus(resource.status),
    programsCount: resource.programs?.length ?? 0,
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
   * Returns one page of faculties. The backend paginates the index endpoint;
   * with no params it responds with the first page.
   */
  list: async (params?: { page?: number; per_page?: number }): Promise<Faculty[]> => {
    const { data } = await http.get<FacultyListResponse>(API_ENDPOINTS.faculties.list, { params })
    return data.data.map(fromResource)
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
