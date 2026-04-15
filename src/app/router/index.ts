import { createRouter, createWebHistory } from 'vue-router'
import { defineComponent, h } from 'vue'
import DashboardLayout from '@/app/layouts/DashboardLayout.vue'

const PlaceholderPage = defineComponent({
  name: 'PlaceholderPage',
  render: () => h('div', { class: 'p-6 text-text-primary' }, 'arch-frontend-v2 — ready'),
})

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
        { path: 'dashboard', component: PlaceholderPage },
      ],
    },
    {
      path: '/_dev',
      component: () => import('@/pages/dev/ComponentGallery.vue'),
    },
  ],
})

router.beforeEach(to => {
  const isAuthenticated = !!localStorage.getItem('auth_token')
  if (to.meta.requiresAuth && !isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guest && isAuthenticated) {
    return { path: '/dashboard' }
  }
})

export default router
