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
 * Verified against the running API. `UserResource::toArray()` returns `roles`
 * (plural — every role name Spatie's `getRoleNames()` resolves, see below),
 * never a singular `role`, and it never includes `faculties`; the field stays
 * declared here as optional for the day that gets fixed. The resource also
 * carries `updated_at` and `last_login`, which nothing in this module reads,
 * so they are deliberately left off this type.
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

// Verified: `status` is the lowercase `UserStatus` backing value on the wire
// ('active' / 'inactive'). The comparison stays case-insensitive so a
// capitalised value would still map correctly.
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
 *
 * An EMPTY `facultyIds` array is dropped rather than sent. Both requests
 * validate `faculties` as `array|min:1`, and `nullable` only exempts `null` —
 * a literal `[]` is still subject to `min:1` and 422s the whole request
 * (`{"faculties":["At least one faculty is required."]}`, confirmed on both
 * store and update against the running API). Since
 * `UserResource` never serialises `faculties`, the edit dialog always opens
 * with an empty selection, so sending it would 422 every edit where the admin
 * did not re-pick faculties. Omitting the key leaves the server-side
 * assignment untouched instead, which is what "I didn't touch the picker"
 * should mean. Create is unaffected — the dialog requires a selection there.
 */
function toPayload(input: Partial<UserInput>): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  if (input.name !== undefined) payload.name = input.name
  if (input.email !== undefined) payload.email = input.email
  if (input.role !== undefined) payload.role = input.role
  if (input.status !== undefined) payload.status = input.status.toLowerCase()
  if (input.facultyIds !== undefined && input.facultyIds.length > 0) {
    payload.faculties = input.facultyIds
  }
  // `password_confirmation` is its own REQUIRED rule on `UserStoreRequest`, not
  // just the mirror half of `confirmed` — sending `password` alone answers 422
  // with BOTH `password: 'Password confirmation does not match.'` and
  // `password_confirmation: 'Password confirmation is required.'`. Confirmed
  // against the running API.
  if (input.password) {
    payload.password = input.password
    payload.password_confirmation = input.password
  }
  return payload
}

/**
 * The edit payload, with an untouched email dropped.
 *
 * Both `UserStoreRequest` and `UserUpdateRequest` validate email with
 * `ends_with:@limu.edu.ly`. On update that rule fires against whatever is
 * *sent*, not against what changed — and the edit dialog pre-fills the field
 * from the record, so re-submitting an existing account whose address predates
 * the rule 422s on a field the operator never touched. Verified against the
 * running API: `PUT /v1/users/{seeded archivist}` echoing back its own
 * `archivist@limu.local` answers
 * `422 {"email":["Email must end with @limu.edu.ly"]}`, which made two of the
 * three seeded accounts uneditable from this screen.
 *
 * Only `email` is dropped, and only when identical: `name`, `role` and `status`
 * carry no rule that an unchanged value can fail, and re-sending `role` is what
 * re-applies the server-side hierarchy expansion.
 */
export function toUpdateInput(next: UserInput, current: User): Partial<UserInput> {
  const changes: Partial<UserInput> = { ...next }
  if (changes.email === current.email) delete changes.email
  return changes
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
  meta?: { current_page?: number; last_page?: number }
}

/**
 * Safety stop for the faculty lookup's page walk below. Nine faculties exist
 * today at the backend's hardcoded 10 rows/page, so this is ~10x headroom and
 * exists only so a malformed `meta` can never spin the loop forever.
 */
const FACULTY_LOOKUP_MAX_PAGES = 10

export const usersApi = {
  /**
   * One page of users for `useServerTable`. Filters map to
   * `Spatie\QueryBuilder` allowlisted filters on `UserController::index`
   * (`filter[name|email|status|role|faculty]`).
   *
   * Verified: `index()` hardcodes `->paginate(10)` and ignores the `per_page`
   * query param — `?per_page=100` still answers `meta.per_page = 10`. So the
   * requested page size never matches what comes back. `useServerTable` trusts
   * the response `meta` over its own state, so this is harmless today; it
   * matters the day a page-size selector is added.
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
   * `Academic\FacultyController::index()` hardcodes `->paginate(10)` and
   * ignores `per_page`, so a single request can only ever surface ten
   * faculties — and a picker that silently omits faculties assigns the wrong
   * ones. This walks the pages instead of asking for a bigger one, using the
   * response `meta.last_page` and stopping at `FACULTY_LOOKUP_MAX_PAGES`.
   *
   * Verified: the response always carries `meta.last_page`, so the fallback to
   * a single page only guards against a shape the endpoint does not currently
   * produce. `per_page` is sent but ignored — the walk is what does the work.
   */
  facultyOptions: async (): Promise<FacultyOption[]> => {
    const rows: FacultyLookupResource[] = []
    let page = 1
    let lastPage = 1

    do {
      const { data } = await http.get<FacultyLookupResponse>(API_ENDPOINTS.faculties.list, {
        params: { page, per_page: 100 },
      })
      rows.push(...data.data)
      lastPage = data.meta?.last_page ?? 1
      page += 1
    } while (page <= lastPage && page <= FACULTY_LOOKUP_MAX_PAGES)

    return rows
      .filter((f) => f.status.toLowerCase() === 'active')
      .map((f) => ({ value: f.id, label: f.name_en }))
  },
}
