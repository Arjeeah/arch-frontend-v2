import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './app/router'
import { i18n } from './app/plugins/i18n'
import './assets/main.css'

createApp(App).use(createPinia()).use(router).use(i18n).mount('#app')
