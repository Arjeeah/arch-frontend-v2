import { http } from '@/app/plugins/axios'
import { API_ENDPOINTS } from '@/app/config/api'
import { ROLES } from '../types'
import type { User, UserInput, UserRole, UserStatus } from '../types'

/** A faculty as nested on the user resource (snake_case). */
interface UserFacultyResource {
  id: number
  name_en: string
}

/** A user exactly as the backend sends it (Laravel resource, snake_case). */
interface UserResource {
  id: number
  name: string
  email: string
  role: string
  status: string
  created_at: string
  faculties?: UserFacultyResource[]
}

/** `show` / `store` / `update` responses are wrapped in a single `data` key. */
interface UserItemResponse {
  data: UserResource
}

/** `index` is paginated: `{ data: [...], meta, links }`. */
interface UserListResponse {
  data: UserResource[]
}

function toRole(raw: string): UserRole {
  // Unknown slugs fall back to the least privileged role rather than widening
  // the type — the UI must never render an unrecognised role as privileged.
  return ROLES.find((r) => r.value === raw)?.value ?? 'faculty_staff'
}

// verify against live API: assumes status is a lowercase string on the wire.
// Comparison is case-insensitive so a capitalised value still maps correctly.
function toStatus(raw: string): UserStatus {
  return raw.toLowerCase() === 'active' ? 'Active' : 'Inactive'
}

/** snake_case wire format -> camelCase UI model. */
function fromResource(resource: UserResource): User {
  return {
    id: resource.id,
    name: resource.name,
    email: resource.email,
    role: toRole(resource.role),
    status: toStatus(resource.status),
    createdAt: resource.created_at,
    faculties: (resource.faculties ?? []).map((f) => ({ id: f.id, nameEN: f.name_en })),
  }
}

/**
 * camelCase UI model -> snake_case request payload.
 *
 * Faculty assignment is not sent: the dialog has no faculty picker, and the
 * users module cannot import the faculties module to build one. The backend
 * key for it is `faculty_ids` (array of faculty ids) — verify against live API
 * before wiring a picker.
 */
function toPayload(input: Partial<UserInput>): Record<string, string> {
  const payload: Record<string, string> = {}
  if (input.name !== undefined) payload.name = input.name
  if (input.email !== undefined) payload.email = input.email
  if (input.role !== undefined) payload.role = input.role
  if (input.status !== undefined) payload.status = input.status.toLowerCase()
  if (input.password) {
    payload.password = input.password
    payload.password_confirmation = input.password
  }
  return payload
}

export const usersApi = {
  /**
   * Returns one page of users. The backend paginates the index endpoint;
   * with no params it responds with the first page.
   */
  list: async (params?: { page?: number; per_page?: number }): Promise<User[]> => {
    const { data } = await http.get<UserListResponse>(API_ENDPOINTS.users.list, { params })
    return data.data.map(fromResource)
  },

  show: async (id: number): Promise<User> => {
    const { data } = await http.get<UserItemResponse>(API_ENDPOINTS.users.show(id))
    return fromResource(data.data)
  },

  create: async (input: UserInput): Promise<User> => {
    const { data } = await http.post<UserItemResponse>(API_ENDPOINTS.users.create, toPayload(input))
    return fromResource(data.data)
  },

  update: async (id: number, input: Partial<UserInput>): Promise<User> => {
    const { data } = await http.put<UserItemResponse>(
      API_ENDPOINTS.users.update(id),
      toPayload(input),
    )
    return fromResource(data.data)
  },

  delete: async (id: number): Promise<void> => {
    await http.delete(API_ENDPOINTS.users.delete(id))
  },
}
