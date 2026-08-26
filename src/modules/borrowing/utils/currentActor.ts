import { authStorage } from '@/app/config/authStorage'

/** Highest authority first — mirrors the backend's `UserRole::hierarchy()`. */
const ROLE_HIERARCHY = ['super_admin', 'archivist', 'faculty_staff'] as const

type ActorRole = (typeof ROLE_HIERARCHY)[number]

/**
 * The persisted session, read structurally.
 *
 * `authStorage.getUser()` is typed `AuthUser`, which declares a singular
 * `role: UserRole`. The live `UserResource` does not emit that key — it emits
 * `roles`, a plural array holding every role Spatie resolved, because
 * `assignRoleWithHierarchy()` gives a `super_admin` all three role rows. So
 * reading `.role` alone yields `undefined` against the real API, and every
 * workflow button silently disappears for every user, super admins included.
 *
 * Repairing `AuthUser` itself belongs to the auth module (outside this
 * stream), so this accepts BOTH shapes and picks the highest role it finds.
 * That keeps the borrowing gate correct today and still correct after the auth
 * module is fixed, in either direction. See WIRING.md.
 */
function readSession(): { id: string | null; role: ActorRole | null } {
  const stored: unknown = authStorage.getUser()
  if (!stored || typeof stored !== 'object') return { id: null, role: null }

  const record = stored as Record<string, unknown>

  // `users.id` is a UUID string on the backend but is typed `number` in the
  // auth module — stringify so an ownership comparison never mismatches on type.
  const rawId = record.id
  const id = typeof rawId === 'string' || typeof rawId === 'number' ? String(rawId) : null

  const single = record.role
  if (typeof single === 'string') {
    const match = ROLE_HIERARCHY.find((candidate) => candidate === single)
    if (match) return { id, role: match }
  }

  const many = record.roles
  if (Array.isArray(many)) {
    const held = new Set(many.filter((entry): entry is string => typeof entry === 'string'))
    const highest = ROLE_HIERARCHY.find((candidate) => held.has(candidate))
    if (highest) return { id, role: highest }
  }

  return { id, role: null }
}

/**
 * Role-gating for the borrowing workflow buttons, straight from
 * `BorrowingPolicy.php`:
 *   - approve / reject / mark-borrowed / return: archivist + super_admin
 *   - create (request-new): faculty_staff only
 *   - update / delete a pending request: its own requester only
 *
 * The session is read through `authStorage` (from `app/config`, not the auth
 * module — a module-to-module import would trip the boundaries lint rule).
 * Role and id only change on login/logout, both of which navigate away from
 * this page, so a plain snapshot read is enough; no need to subscribe to the
 * auth store reactively.
 *
 * An unrecognised or missing role grants nothing — the UI must never render a
 * privileged action for a session it could not identify.
 */
export function currentActor(): {
  id: string | null
  canManageWorkflow: boolean
  canRequest: boolean
  /** `BorrowingPolicy::delete` lets a super_admin delete *any* borrowing, not just archivist+admin. */
  canDeleteAny: boolean
} {
  const { id, role } = readSession()
  return {
    id,
    canManageWorkflow: role === 'archivist' || role === 'super_admin',
    canRequest: role === 'faculty_staff',
    canDeleteAny: role === 'super_admin',
  }
}
