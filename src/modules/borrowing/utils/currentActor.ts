import { authStorage } from '@/app/config/authStorage'

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
 */
export function currentActor(): {
  id: string | null
  canManageWorkflow: boolean
  canRequest: boolean
  /** `BorrowingPolicy::delete` lets a super_admin delete *any* borrowing, not just archivist+admin. */
  canDeleteAny: boolean
} {
  const user = authStorage.getUser()
  const role = user?.role ?? null
  return {
    // verify against live API: `AuthUser.id` is typed `number` in the auth
    // module today, but `users.id` is a UUID string on the backend — stringify
    // defensively so an ownership comparison never silently mismatches on type.
    id: user ? String(user.id) : null,
    canManageWorkflow: role === 'archivist' || role === 'super_admin',
    canRequest: role === 'faculty_staff',
    canDeleteAny: role === 'super_admin',
  }
}
