import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './app/router'
import { i18n } from './app/plugins/i18n'
import { useAuthStore } from './modules/auth/store/useAuthStore'
import './assets/main.css'

function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)
  app.use(router)
  app.use(i18n)

  // Restore the stored session before mounting, so the router guard and the
  // sidebar see a role on the very first navigation. Synchronous by design —
  // `GET /v1/me` is not routed on this API (404), and blocking the mount on a
  // request that always fails bought nothing. See `useAuthStore.init()`.
  const authStore = useAuthStore(pinia)
  authStore.init()

  app.mount('#app')
}

bootstrap()
