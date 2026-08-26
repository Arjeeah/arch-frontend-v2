import type { Router, RouteLocationRaw } from 'vue-router'
import { roleAllowed } from '@/app/config/sessionRole'

/**
 * Resolves a notification's `action_url` to a route this frontend actually
 * serves, or `null` when it does not serve one.
 *
 * The backend builds `action_url` from its own URL vocabulary. All four shapes
 * it emits today (`grep -rh "'action_url'" app/Notifications/` →
 * `/borrowings/{id}`, `/student-documents/{id}`,
 * `/audit-logs?action=failed_login`, `/settings/storage`) do reach a real
 * screen: `/student-documents/:id` and `/settings/:group?` match natively, and
 * the router carries compatibility redirects for the other two. Resolving
 * first is still the rule — the two vocabularies are maintained on opposite
 * sides of the wire, so a new notification class can introduce a path this app
 * has never served, and pushing one drops the user on the 404 catch-all.
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
 * CAVEAT on the two redirect records: `router.resolve()` does not follow a
 * redirect, so for `/borrowings/{id}` and `/audit-logs` the `meta` inspected
 * below is the redirect record's, not the destination's. That is safe for
 * every notification the backend currently sends — `/borrowing` carries no
 * role allowlist, and the only sender of `/audit-logs` (`SecurityAlert`) goes
 * to super_admin, who may enter `/audit` anyway. It stops being safe the
 * moment `/borrowing` gains a `meta.roles` or a security alert is addressed to
 * an archivist; either change needs the destination resolved here instead.
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
