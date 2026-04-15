import { createRouter, createWebHistory } from 'vue-router'
import { defineComponent, h } from 'vue'

const PlaceholderPage = defineComponent({
  name: 'PlaceholderPage',
  render() {
    return h('div', { class: 'p-6' }, 'arch-frontend-v2 — placeholder')
  },
})

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: PlaceholderPage },
  ],
})

export default router
