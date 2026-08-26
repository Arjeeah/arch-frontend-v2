import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import DashboardLayout from '@/app/layouts/DashboardLayout.vue'
import { authStorage } from '@/app/config/authStorage'
import type { UserRole } from '@/modules/auth/types'

declare module 'vue-router' {
  interface RouteMeta {
    /** Route is only reachable with a stored token. */
    requiresAuth?: boolean
    /** Route is only for signed-out visitors (login); signed-in users bounce to the dashboard. */
    guest?: boolean
    /**
     * Roles allowed on this route. Omit the key entirely to allow every
     * authenticated role. An empty array is an empty allowlist and locks
     * everyone out — the guard below and `AppSidebar` both treat it that way.
     */
    roles?: readonly UserRole[]
  }
}

/**
 * Fallback landing, and where a role refused a route is sent. Must stay open
 * to every role, otherwise an unauthorised role would bounce forever.
 */
const HOME_PATH = '/dashboard'

/**
 * Where each role lands on `/` and after signing in.
 *
 * All three roles land on `/dashboard`: it is a dispatcher, not one screen —
 * `DashboardPage` reads the stored role and renders the admin, archivist or
 * faculty-staff dashboard, each backed by its own endpoint. Before those
 * landed, `faculty_staff` was sent to `/borrowing` because the shared
 * dashboard had nothing on it for that role.
 */
const ROLE_LANDING: Record<UserRole, string> = {
  super_admin: '/dashboard',
  archivist: '/dashboard',
  faculty_staff: '/dashboard',
}

/**
 * Landing path for the signed-in user, falling back to the shared dashboard.
 *
 * Exported because the login page needs it too: it used to hardcode
 * `'/dashboard'` as its post-login fallback, so repointing a role's landing
 * here would have changed `/` and left the login flow behind.
 */
export function landingFor(role?: UserRole | null): string {
  return role ? ROLE_LANDING[role] : HOME_PATH
}

/** The component gallery is a development aid — it never ships in a build. */
const devRoutes: RouteRecordRaw[] = import.meta.env.DEV
  ? [{ path: '/_dev', component: () => import('@/pages/dev/ComponentGallery.vue') }]
  : []

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      component: () => import('@/modules/auth/pages/LoginPage.vue'),
      meta: { guest: true },
    },
    // Registered before the layout route, whose catch-all child would
    // otherwise be a candidate for `/_dev`.
    ...devRoutes,
    {
      path: '/',
      component: DashboardLayout,
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: () => landingFor(authStorage.getUser()?.role) },

        // ── Overview ──────────────────────────────────────────────────────
        {
          // Open to every role on purpose: this is `HOME_PATH`, where the guard
          // sends every refused navigation, so an allowlist here would loop.
          // The page dispatches on the stored role instead.
          path: 'dashboard',
          component: () => import('@/modules/dashboard/pages/DashboardPage.vue'),
        },
        {
          // `PipelinePolicy::search()` returns true unconditionally.
          path: 'search',
          component: () => import('@/modules/search/pages/SearchPage.vue'),
        },

        // ── Intake pipeline ───────────────────────────────────────────────
        // The two pipeline paths are duplicated as constants inside the pages
        // (`MONITOR_PATH`, `UPLOAD_PATH`) because the pages link to each other.
        // Moving either route means editing those too.
        {
          path: 'pipeline/import',
          component: () => import('@/modules/pipeline/pages/BulkImportPage.vue'),
          meta: { roles: ['super_admin', 'archivist'] },
        },
        {
          path: 'pipeline/monitor',
          component: () => import('@/modules/pipeline/pages/PipelineMonitorPage.vue'),
          meta: { roles: ['super_admin', 'archivist'] },
        },
        {
          // Mirrors `PipelinePolicy::viewStatus/update/verify`.
          path: 'review',
          component: () => import('@/modules/review/pages/ReviewQueuePage.vue'),
          meta: { roles: ['super_admin', 'archivist'] },
        },

        // ── Students and their documents ──────────────────────────────────
        {
          // `faculty_staff` may read the register; the page hides every
          // mutating control and does not link into the detail route for them.
          path: 'students',
          component: () => import('@/modules/students/pages/StudentListPage.vue'),
        },
        {
          // Must stay restricted: the detail page reads
          // `GET /v1/pipeline/status/{id}` per document, which
          // `PipelinePolicy::viewStatus` refuses to `faculty_staff`.
          path: 'students/:id',
          component: () => import('@/modules/students/pages/StudentDetailPage.vue'),
          meta: { roles: ['super_admin', 'archivist'] },
        },
        {
          path: 'student-documents',
          component: () => import('@/modules/student-documents/pages/StudentDocumentListPage.vue'),
          meta: { roles: ['super_admin', 'archivist'] },
        },
        {
          // Registered before the `:id` sibling. Vue Router ranks a static
          // segment above a param either way; the order just reads as intended.
          path: 'student-documents/upload',
          component: () =>
            import('@/modules/student-documents/pages/StudentDocumentUploadPage.vue'),
          meta: { roles: ['super_admin', 'archivist'] },
        },
        {
          path: 'student-documents/:id',
          component: () =>
            import('@/modules/student-documents/pages/StudentDocumentDetailPage.vue'),
          meta: { roles: ['super_admin', 'archivist'] },
        },

        // ── People ────────────────────────────────────────────────────────
        {
          path: 'users',
          component: () => import('@/modules/users/pages/UserListPage.vue'),
          meta: { roles: ['super_admin'] },
        },
        {
          path: 'users/:id',
          component: () => import('@/modules/users/pages/UserDetailPage.vue'),
          meta: { roles: ['super_admin'] },
        },
        {
          // `BorrowingPolicy::viewAny` returns true; the controller narrows
          // `faculty_staff` to their own requests server-side.
          path: 'borrowing',
          component: () => import('@/modules/borrowing/pages/BorrowingListPage.vue'),
        },

        // ── Academic structure ────────────────────────────────────────────
        {
          path: 'faculties',
          component: () => import('@/modules/faculties/pages/FacultyListPage.vue'),
          meta: { roles: ['super_admin', 'archivist'] },
        },
        {
          path: 'programs',
          component: () => import('@/modules/programs/pages/ProgramListPage.vue'),
          meta: { roles: ['super_admin', 'archivist'] },
        },
        {
          path: 'document-types',
          component: () => import('@/modules/document-types/pages/DocumentTypeListPage.vue'),
          meta: { roles: ['super_admin', 'archivist'] },
        },

        // ── Physical archive ──────────────────────────────────────────────
        // Rooms → cabinets → drawers is a drill-down, so only the top level
        // gets a sidebar entry. `CabinetDrawersPage` also reads an optional
        // `?roomId=` the rooms page appends, for its back link.
        {
          path: 'archive-room',
          component: () => import('@/modules/locations/pages/RoomsPage.vue'),
          meta: { roles: ['super_admin', 'archivist'] },
        },
        {
          path: 'archive-room/rooms/:roomId',
          component: () => import('@/modules/locations/pages/RoomCabinetsPage.vue'),
          meta: { roles: ['super_admin', 'archivist'] },
        },
        {
          path: 'archive-room/cabinets/:cabinetId',
          component: () => import('@/modules/locations/pages/CabinetDrawersPage.vue'),
          meta: { roles: ['super_admin', 'archivist'] },
        },

        // ── Oversight ─────────────────────────────────────────────────────
        {
          // Narrower than `AuditLogPolicy::viewAny`, which returns true for
          // every role and scopes faculty staff to their own rows server-side
          // (`AuditLogService::isFacultyOnly`). The allowlist matches
          // `viewStats`/`export` instead, because the page leads with the stat
          // cards and the CSV export, both of which 403 for `faculty_staff`.
          // Opening it up means hiding those two for that role first.
          path: 'audit',
          component: () => import('@/modules/audit/pages/AuditPage.vue'),
          meta: { roles: ['super_admin', 'archivist'] },
        },
        {
          // `faculty_staff` is included deliberately: `ReportPolicy` grants it
          // `audit_logs`, `borrowings`, `student_documents` and
          // `faculty_report`, and `GET /v1/reports/types` is filtered per role
          // server-side, so the catalog it sees is the one it may generate.
          path: 'reports',
          component: () => import('@/modules/reports/pages/ReportsPage.vue'),
          meta: { roles: ['super_admin', 'archivist', 'faculty_staff'] },
        },
        {
          // Both import controllers `abort(403)` for `faculty_staff`.
          path: 'imports',
          component: () => import('@/modules/imports/pages/ImportsPage.vue'),
          meta: { roles: ['super_admin', 'archivist'] },
        },

        // ── Personal / administration ─────────────────────────────────────
        {
          path: 'notifications',
          component: () => import('@/modules/notifications/pages/NotificationsListPage.vue'),
        },
        {
          // The optional `:group` param is load-bearing: the backend's
          // storage-capacity notification deep-links to `/settings/storage`,
          // and the page reads the param to pick its opening tab (falling back
          // to `general`).
          path: 'settings/:group?',
          component: () => import('@/modules/settings/pages/SettingsPage.vue'),
          meta: { roles: ['super_admin'] },
        },

        /**
         * Compatibility redirects for the backend's notification `action_url`
         * vocabulary, which is not this router's. `grep -rh "'action_url'"
         * app/Notifications/` yields `/borrowings/{id}`,
         * `/student-documents/{id}`, `/audit-logs?action=failed_login` and
         * `/settings/storage`. The last two of those resolve natively now; the
         * two below cover the rest. Without them `resolveActionRoute` matches
         * only the 404 catch-all and the notification's link stays inert.
         *
         * There is no borrowing detail page, so `/borrowings/:id` lands on the
         * list. `/audit-logs` keeps its query so a filterable audit page can
         * honour `?action=` later without another change here.
         */
        { path: 'borrowings/:id', redirect: '/borrowing' },
        { path: 'audit-logs', redirect: (to) => ({ path: '/audit', query: to.query }) },

        /**
         * 404 lives *inside* the layout so an unknown path keeps the sidebar
         * and header. As a top-level sibling it unmounted the whole app shell
         * and stranded the user on a bare page with one way out.
         *
         * It inherits `requiresAuth` from the parent, so a signed-out visitor
         * on a bad URL is sent to login rather than shown a 404 they can do
         * nothing with.
         *
         * Keep it LAST — every route above must be declared before it.
         */
        {
          path: ':pathMatch(.*)*',
          name: 'not-found',
          component: () => import('@/app/pages/NotFoundPage.vue'),
        },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const isAuthenticated = !!authStorage.getToken()

  if (to.meta.requiresAuth && !isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guest && isAuthenticated) {
    return { path: landingFor(authStorage.getUser()?.role) }
  }

  const allowedRoles = to.meta.roles
  if (isAuthenticated && allowedRoles && to.path !== HOME_PATH) {
    const role = authStorage.getUser()?.role
    if (!role || !allowedRoles.includes(role)) {
      return { path: HOME_PATH }
    }
  }
})

export default router
