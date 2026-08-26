import type { Router, RouteLocationRaw } from 'vue-router'
import { roleAllowed } from '@/app/config/sessionRole'

/**
 * Resolves a notification's `action_url` to a route this frontend actually
 * serves, or `null` when it does not serve one.
 *
 * The backend builds `action_url` from its own URL vocabulary, which does not
 * currently line up with the router's (`grep -rh "'action_url'"
 * app/Notifications/` → `/borrowings/{id}`, `/student-documents/{id}`,
 * `/audit-logs?action=failed_login`, `/settings/storage`; the frontend serves
 * `/borrowing`, `/audit`, `/settings/:group?` and has no student-documents
 * route yet). Pushing an unmatched path drops the user on the 404 catch-all,
 * so every navigation resolves first — see WIRING.md, which asks phase 3 to
 * reconcile the two vocabularies.
 *
 * The catch-all is a *child* of the layout route, so an unserved path still
 * reports `matched.length > 0`; the route name is what distinguishes it.
 *
 * A resolved path is not enough on its own: the route's `meta.roles` has to
 * admit the signed-in role too, or the guard bounces the click to `/dashboard`
 * with no explanation. `StorageCapacityWarningNotification` is sent to
 * super_admin *and* archivist but deep-links to `/settings/storage`, which is
 * super_admin only — so every archivist who clicked it dead-ended. Returning
 * `null` here is what routes them to the "no destination" toast instead.
 *
 * Returning the location (rather than a boolean) keeps the caller cast-free:
 * a truthy result is already a valid `router.push` argument.
 */
export function resolveActionRoute(
  router: Router,
  actionUrl: string | null,
): RouteLocationRaw | null {
  if (!actionUrl) return null
  try {
    const resolved = router.resolve(actionUrl)
    if (!resolved.matched.length || resolved.name === 'not-found') return null
    if (!roleAllowed(resolved.meta.roles)) return null
    return resolved
  } catch {
    // `resolve` throws on a malformed path. `action_url` is untrusted wire
    // data, so treat anything unparseable as "no destination".
    return null
  }
}
