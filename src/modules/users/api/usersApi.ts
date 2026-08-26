import { http } from '@/app/plugins/axios'
import { API_ENDPOINTS } from '@/app/config/api'
import type { User, UserInput, UserRole, UserStatus } from '../types'
import type { ServerTableParams, ServerTableResponse } from '@/shared/composables/useServerTable'

/** A faculty as nested on the user resource (snake_case). */
interface UserFacultyResource {
  id: number
  name_en: string
}

/**
 * A user exactly as the backend sends it (Laravel resource, snake_case).
 *
 * verify against live API: `UserResource::toArray()` returns `roles` (plural,
 * every role name Spatie's `getRoleNames()` resolves — see below), not a
 * singular `role`. It also never includes `faculties`, despite the field
 * still being declared here for the day that gets fixed.
 */
interface UserResource {
  id: string
  name: string
  email: string
  roles: string[]
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
  meta?: { current_page?: number; last_page?: number; total?: number }
}

/**
 * `assignRoleWithHierarchy` on the backend gives `super_admin` every lower
 * role too (`[super_admin, archivist, faculty_staff]`) and `archivist`
 * inherits `faculty_staff` — so `roles` on the wire is not one value, it's
 * the whole inherited set. The UI only ever needs the highest one, in the
 * same order the backend's own `UserRole::hierarchy()` defines.
 */
const ROLE_HIERARCHY: UserRole[] = ['super_admin', 'archivist', 'faculty_staff']

function toRole(roles: string[]): UserRole {
  for (const candidate of ROLE_HIERARCHY) {
    if (roles.includes(candidate)) return candidate
  }
  // Unknown/empty role set falls back to the least privileged role rather
  // than widening the type — the UI must never render an unrecognised or
  // missing role as privileged.
  return 'faculty_staff'
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
    role: toRole(resource.roles ?? []),
    status: toStatus(resource.status),
    createdAt: resource.created_at,
    faculties: (resource.faculties ?? []).map((f) => ({ id: f.id, nameEN: f.name_en })),
  }
}

/**
 * camelCase UI model -> snake_case request payload.
 *
 * The write key for role assignment is singular `role` (one slug — the
 * hierarchy expansion above happens server-side), while faculty assignment
 * goes under `faculties` (array of faculty ids) — see `UserStoreRequest` /
 * `UserUpdateRequest`. Both are asymmetric with the `roles` / (missing)
 * `faculties` read keys on `UserResource`, which is exactly why this mapper
 * exists instead of a shared casing interceptor.
 */
function toPayload(input: Partial<UserInput>): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  if (input.name !== undefined) payload.name = input.name
  if (input.email !== undefined) payload.email = input.email
  if (input.role !== undefined) payload.role = input.role
  if (input.status !== undefined) payload.status = input.status.toLowerCase()
  if (input.facultyIds !== undefined) payload.faculties = input.facultyIds
  if (input.password) {
    payload.password = input.password
    payload.password_confirmation = input.password
  }
  return payload
}

/** One faculty option for the create/edit dialog's chip picker. */
export interface FacultyOption {
  value: number
  label: string
}

/** A faculty as returned by the academic faculties lookup (snake_case, partial). */
interface FacultyLookupResource {
  id: number
  name_en: string
  status: string
}

interface FacultyLookupResponse {
  data: FacultyLookupResource[]
}

export const usersApi = {
  /**
   * One page of users for `useServerTable`. Filters map to
   * `Spatie\QueryBuilder` allowlisted filters on `UserController::index`
   * (`filter[name|email|status|role|faculty]`).
   *
   * verify against live API: `index()` hardcodes `->paginate(10)` and ignores
   * the `per_page` query param, so the requested page size may not match what
   * comes back — `useServerTable` already trusts the response `meta` over its
   * own state, so this is harmless, just worth knowing.
   */
  list: async (params: ServerTableParams): Promise<ServerTableResponse<User>> => {
    const { data } = await http.get<UserListResponse>(API_ENDPOINTS.users.list, { params })
    return {
      data: data.data.map(fromResource),
      meta: data.meta ?? {},
    }
  },

  show: async (id: string): Promise<User> => {
    const { data } = await http.get<UserItemResponse>(API_ENDPOINTS.users.show(id))
    return fromResource(data.data)
  },

  create: async (input: UserInput): Promise<User> => {
    const { data } = await http.post<UserItemResponse>(API_ENDPOINTS.users.create, toPayload(input))
    return fromResource(data.data)
  },

  update: async (id: string, input: Partial<UserInput>): Promise<User> => {
    const { data } = await http.put<UserItemResponse>(
      API_ENDPOINTS.users.update(id),
      toPayload(input),
    )
    return fromResource(data.data)
  },

  delete: async (id: string): Promise<void> => {
    await http.delete(API_ENDPOINTS.users.delete(id))
  },

  /**
   * Faculty options for the create/edit dialog's chip picker. Hits
   * `/v1/academic/faculties` directly (an HTTP call, not a module import —
   * the users module cannot import `modules/faculties`).
   *
   * verify against live API: `Academic\FacultyController::index()` also
   * hardcodes `->paginate(10)`, so this can only ever surface the first 10
   * faculties. That matches the current roster (9 faculties per the team
   * plan) but will silently truncate the picker if more are added before the
   * backend's pagination is fixed.
   */
  facultyOptions: async (): Promise<FacultyOption[]> => {
    const { data } = await http.get<FacultyLookupResponse>(API_ENDPOINTS.faculties.list, {
      params: { per_page: 100 },
    })
    return data.data
      .filter((f) => f.status.toLowerCase() === 'active')
      .map((f) => ({ value: f.id, label: f.name_en }))
  },
}
