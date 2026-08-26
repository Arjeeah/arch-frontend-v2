import { AUTH_ROLES, type UserRole } from '@/modules/auth/types'
import { authStorage } from './authStorage'

/**
 * The effective role of the signed-in user, or `null` when it cannot be read.
 *
 * Lives in `src/app/config/` next to `authStorage` because four modules need
 * it — `dashboard`, `audit`, `notifications` and `search` — and a module may
 * not import another module. It is also the same source the router guard
 * decides on, so a screen that hides a control and the guard that would refuse
 * the navigation can never disagree.
 *
 * Two stored shapes are accepted on purpose. The app's own `AuthUser` carries a
 * scalar `role`, but the backend's login response is a `UserResource`, which
 * serialises Spatie's `getRoleNames()` as a `roles` **array** — and those roles
 * are hierarchical (`User::assignRoleWithHierarchy`): a super_admin literally
 * holds all three names and an archivist holds two. An array is therefore
 * reduced by `AUTH_ROLES` precedence, never by taking the first element, or
 * every super_admin would be treated as faculty staff.
 */
export function readSessionRole(): UserRole | null {
  const stored: unknown = authStorage.getUser()
  if (!stored || typeof stored !== 'object') return null

  const session = stored as { role?: unknown; roles?: unknown }

  if (typeof session.role === 'string' && isUserRole(session.role)) return session.role

  if (Array.isArray(session.roles)) {
    const held = session.roles.filter((name): name is string => typeof name === 'string')
    return AUTH_ROLES.find((role) => held.includes(role)) ?? null
  }

  return null
}

export function isUserRole(value: string): value is UserRole {
  return (AUTH_ROLES as readonly string[]).includes(value)
}

/**
 * Whether the stored role may enter a route carrying `allowedRoles`.
 *
 * Mirrors the guard in `src/app/router/index.ts`: an absent allowlist means
 * every authenticated role, an empty one locks everyone out.
 */
export function roleAllowed(
  allowedRoles: readonly string[] | undefined,
  role: string | null = readSessionRole(),
): boolean {
  if (!allowedRoles) return true
  return !!role && allowedRoles.includes(role)
}
