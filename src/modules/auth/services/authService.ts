import { http } from '@/app/plugins/axios'
import { API_ENDPOINTS } from '@/app/config/api'
import { AUTH_ROLES } from '../types'
import type { AuthUser, LoginCredentials, LoginResponse, UserRole } from '../types'

/**
 * `UserResource::toArray()` exactly as it comes off the wire.
 *
 * Two things about it decide the shape of everything downstream:
 *
 * - `id` is a **UUID string**. `User` uses `HasUuids`; nothing here is numeric.
 * - Roles arrive as `roles`, a **plural array of slugs**, not a scalar `role`.
 *   `User::assignRoleWithHierarchy()` writes a row per inherited role, so
 *   `getRoleNames()` returns all three names for a super admin and two for an
 *   archivist. Taking `roles[0]` would be a coin flip; `reduceRoles()` picks by
 *   precedence instead.
 */
interface UserResource {
  id: string
  name: string
  email: string
  roles?: string[]
  /**
   * Present on the resource, unused here — the app has no disabled-account UI,
   * and it does not need one: the backend refuses an inactive account at login
   * with `403 { message: 'Your account is inactive. Please contact support.' }`,
   * which the store surfaces as the form error.
   */
  status?: string
}

/**
 * `POST /v1/login` answers with a `UserResource` wrapped by Laravel plus
 * siblings: `(new UserResource($user))->additional(['token' => …])` produces
 * `{ data: {...}, token, message }` — confirmed verbatim against the running
 * API for all three accounts. There is no `user` key — reading one gave
 * `undefined`, `authStorage` then wrote the literal string `"undefined"` into
 * `auth_user`, and every later `getUser()` failed its `JSON.parse` and returned
 * `null`. That single mismatch blinded the router guard, `AppSidebar` and every
 * module that reads the stored role.
 */
interface LoginResource {
  data: UserResource
  token: string
  message?: string
}

/**
 * The highest role in `roles`, or `null` when none is recognised.
 *
 * `AUTH_ROLES` is ordered highest-authority-first, so the first hit wins.
 * Returning `null` rather than guessing is deliberate: a session whose role
 * could not be identified must not be granted anything.
 */
function reduceRoles(roles: readonly string[] | undefined): UserRole | null {
  if (!roles) return null
  const held = new Set(roles)
  return AUTH_ROLES.find((candidate) => held.has(candidate)) ?? null
}

/** Wire → UI model. Throws rather than persisting a session with no role. */
function fromResource(resource: UserResource): AuthUser {
  const role = reduceRoles(resource.roles)
  if (!role) {
    throw new Error(`Login response carried no recognised role: ${JSON.stringify(resource.roles)}`)
  }
  return {
    id: String(resource.id),
    name: resource.name,
    email: resource.email,
    role,
  }
}

export const AuthService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const { data } = await http.post<LoginResource>(API_ENDPOINTS.auth.login, credentials)
    return { token: data.token, user: fromResource(data.data) }
  },

  async logout(): Promise<void> {
    await http.post(API_ENDPOINTS.auth.logout)
  },

  /**
   * Re-reads the signed-in user.
   *
   * Verified against the running API: `GET /v1/me` is **not registered** in
   * `routes/api/v1.php` and answers
   * `404 {"message":"The route api/v1/me could not be found."}`.
   *
   * **Deliberately unreferenced today.** `useAuthStore.init()` used to await
   * this on every boot and swallow the 404 (only a 401 cleared the session), so
   * the app started from the stored user regardless and paid one blocking
   * failed request plus a console error per load. `init()` now rehydrates from
   * `authStorage` instead.
   *
   * This mapper is kept rather than deleted because it is already correct: the
   * `{ data: UserResource }` envelope is the one every other endpoint uses, and
   * `fromResource` reduces the `roles` array the same way login does. When the
   * backend registers the route, re-await this in `init()` — nothing else
   * changes.
   */
  async me(): Promise<AuthUser> {
    const { data } = await http.get<{ data: UserResource }>(API_ENDPOINTS.auth.me)
    return fromResource(data.data)
  },
}
