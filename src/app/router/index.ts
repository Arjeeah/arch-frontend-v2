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
      path: '/',
      component: DashboardLayout,
      children: [
        { path: '', component: PlaceholderPage },
      ],
    },
  ],
})

export default router
