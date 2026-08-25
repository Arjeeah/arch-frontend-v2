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
     * authenticated role — an empty array would lock everyone out.
     */
    roles?: readonly UserRole[]
  }
}

/** Where an unauthorised role (and a signed-in guest) lands. Open to all roles. */
const HOME_PATH = '/dashboard'

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
    {
      path: '/',
      component: DashboardLayout,
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: HOME_PATH },
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
      ],
    },
    ...devRoutes,
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/app/pages/NotFoundPage.vue'),
    },
  ],
})

router.beforeEach((to) => {
  const isAuthenticated = !!authStorage.getToken()

  if (to.meta.requiresAuth && !isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guest && isAuthenticated) {
    return { path: HOME_PATH }
  }

  const allowedRoles = to.meta.roles
  if (isAuthenticated && allowedRoles && allowedRoles.length > 0 && to.path !== HOME_PATH) {
    const role = authStorage.getUser()?.role
    if (!role || !allowedRoles.includes(role)) {
      return { path: HOME_PATH }
    }
  }
})

export default router
