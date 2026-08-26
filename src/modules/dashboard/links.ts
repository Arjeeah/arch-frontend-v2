/**
 * Where the dashboard's call-to-action buttons point.
 *
 * They live in one place because the target screens are owned by other modules
 * and landed at different times. All three resolve today — `/settings` matches
 * `settings/:group?` — but `DashboardLinkButton` still asks the router whether
 * a path resolves and disables itself when it does not: these are cross-module
 * paths, so a rename on the far side degrades to a greyed-out button instead
 * of a link into the 404 page. If a route moves, change it here only.
 */
export const DASHBOARD_LINKS = {
  /** Settings module (super_admin). */
  settings: '/settings',
  /** User management (super_admin). */
  users: '/users',
  /** Reports module — the weekly digest is generated there. */
  reports: '/reports',
} as const
