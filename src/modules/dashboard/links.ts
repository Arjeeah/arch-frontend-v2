/**
 * Where the dashboard's call-to-action buttons point.
 *
 * They live in one place because the target screens are owned by other modules
 * and land at different times: `/users` exists today, `/settings` and
 * `/reports` arrive with their own modules. `DashboardLinkButton` asks the
 * router whether a path resolves and disables itself until it does, so a
 * missing module degrades to a greyed-out button instead of a link into the
 * 404 page. If a route ends up on a different path, change it here only.
 */
export const DASHBOARD_LINKS = {
  /** Settings module (super_admin). */
  settings: '/settings',
  /** User management (super_admin). */
  users: '/users',
  /** Reports module — the weekly digest is generated there. */
  reports: '/reports',
} as const
