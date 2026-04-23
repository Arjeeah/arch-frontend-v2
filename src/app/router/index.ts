import { createRouter, createWebHistory } from 'vue-router'
import DashboardLayout from '@/app/layouts/DashboardLayout.vue'

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
        { path: '', redirect: '/dashboard' },
        {
          path: 'dashboard',
          component: () => import('@/modules/dashboard/pages/DashboardPage.vue'),
        },
        { path: 'users', component: () => import('@/modules/users/pages/UserListPage.vue') },
        { path: 'users/:id', component: () => import('@/modules/users/pages/UserDetailPage.vue') },
        {
          path: 'audit',
          component: () => import('@/modules/audit/pages/AuditPage.vue'),
        },
      ],
    },
    {
      path: '/_dev',
      component: () => import('@/pages/dev/ComponentGallery.vue'),
    },
  ],
})

router.beforeEach((to) => {
  const isAuthenticated = !!localStorage.getItem('auth_token')
  if (to.meta.requiresAuth && !isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guest && isAuthenticated) {
    return { path: '/dashboard' }
  }
})

export default router
