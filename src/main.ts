import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './app/router'
import { i18n } from './app/plugins/i18n'
import { useAuthStore } from './modules/auth/store/useAuthStore'
import './assets/main.css'

async function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)
  app.use(router)
  app.use(i18n)

  // Validate existing token before mounting
  const authStore = useAuthStore(pinia)
  await authStore.init()

  app.mount('#app')
}

bootstrap()
