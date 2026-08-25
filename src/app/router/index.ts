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
 * `faculty_staff` has no admin widgets to look at, so it goes straight to the
 * one feature area it owns rather than to the shared dashboard.
 */
const ROLE_LANDING: Record<UserRole, string> = {
  super_admin: '/dashboard',
  archivist: '/dashboard',
  faculty_staff: '/borrowing',
}

/** Landing path for the signed-in user, falling back to the shared dashboard. */
function landingFor(role?: UserRole | null): string {
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
        {
          path: 'dashboard',
          component: () => import('@/modules/dashboard/pages/DashboardPage.vue'),
        },
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
          path: 'borrowing',
          component: () => import('@/modules/borrowing/pages/BorrowingListPage.vue'),
        },
        {
          path: 'faculties',
          component: () => import('@/modules/faculties/pages/FacultyListPage.vue'),
          meta: { roles: ['super_admin', 'archivist'] },
        },
        {
          path: 'audit',
          component: () => import('@/modules/audit/pages/AuditPage.vue'),
          meta: { roles: ['super_admin', 'archivist'] },
        },
        /**
         * 404 lives *inside* the layout so an unknown path keeps the sidebar
         * and header. As a top-level sibling it unmounted the whole app shell
         * and stranded the user on a bare page with one way out.
         *
         * It inherits `requiresAuth` from the parent, so a signed-out visitor
         * on a bad URL is sent to login rather than shown a 404 they can do
         * nothing with.
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
