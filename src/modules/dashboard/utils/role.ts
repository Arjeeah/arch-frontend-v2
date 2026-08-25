import { authStorage } from '@/app/config/authStorage'
import { USER_ROLE_SLUGS } from '../types'

/** Highest privilege first — the order `readSessionRole` resolves ties in. */
const ROLE_PRECEDENCE = USER_ROLE_SLUGS

function isKnownRole(value: string): boolean {
  return (ROLE_PRECEDENCE as readonly string[]).includes(value)
}

/**
 * The effective role of the signed-in user, or `null` when it cannot be read.
 *
 * Read from `authStorage` (in `src/app/config/`) rather than the auth store,
 * because a module may not import another module — and this is the same source
 * the router guard decides on.
 *
 * Two shapes are accepted on purpose. The app's own `AuthUser` carries a scalar
 * `role`, but the backend's login response is a `UserResource`, which serialises
 * Spatie's `getRoleNames()` as a `roles` **array** — and those roles are
 * hierarchical (`User::assignRoleWithHierarchy`): a super_admin literally holds
 * all three names and an archivist holds two. An array is therefore reduced by
 * precedence, never by taking the first element, or every super_admin would be
 * treated as faculty staff.
 *
 * verify against live API: which of the two shapes actually reaches storage
 * depends on the auth module's login mapping, which is outside this module.
 */
export function readSessionRole(): string | null {
  const stored: unknown = authStorage.getUser()
  if (!stored || typeof stored !== 'object') return null

  const session = stored as { role?: unknown; roles?: unknown }

  if (typeof session.role === 'string' && isKnownRole(session.role)) return session.role

  if (Array.isArray(session.roles)) {
    const held = session.roles.filter((name): name is string => typeof name === 'string')
    return ROLE_PRECEDENCE.find((role) => held.includes(role)) ?? null
  }

  return null
}
