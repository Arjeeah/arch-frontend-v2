export interface LoginCredentials {
  email: string
  password: string
}

/**
 * The role slugs the backend issues, **highest authority first** — the order
 * mirrors `UserRole::hierarchy()` server-side and `reduceRoles()` in
 * `services/authService.ts` depends on it.
 *
 * A user holds one *effective* role here, but not on the wire: Spatie roles are
 * hierarchical (`User::assignRoleWithHierarchy()` writes every lower role row
 * too), so `UserResource` reports a super admin as holding all three. The api
 * mapper reduces that array by this precedence before anything else sees it.
 *
 * Route access is decided from the reduced value in `src/app/router/index.ts`
 * (`meta.roles`).
 */
export const AUTH_ROLES = ['super_admin', 'archivist', 'faculty_staff'] as const

export type UserRole = (typeof AUTH_ROLES)[number]

export interface AuthUser {
  /** `users.id` is a UUID string (`HasUuids`), never an integer. */
  id: string
  name: string
  email: string
  /** The highest role the account holds — see `AUTH_ROLES`. */
  role: UserRole
}

export interface LoginResponse {
  token: string
  user: AuthUser
}
