<script setup lang="ts">
import AppSidebar from '@/shared/components/AppSidebar.vue'
import AppHeader from '@/shared/components/AppHeader.vue'
import { useAuthStore } from '@/modules/auth/store/useAuthStore'
import { isSupportedLocale, setLocale } from '@/app/plugins/i18n'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}

// The header can't reach `src/app/` itself, so the layout does the persisting.
function handleLocaleChange(locale: string) {
  if (isSupportedLocale(locale)) setLocale(locale)
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-surface font-sans">
    <!-- Sidebar (never scrolls) -->
    <AppSidebar :role="authStore.role" />

    <!-- Main area -->
    <div class="flex flex-col flex-1 min-w-0 h-screen">
      <!-- Top header (never scrolls) -->
      <AppHeader
        :user-name="authStore.userName ?? undefined"
        @logout="handleLogout"
        @locale-change="handleLocaleChange"
      />

      <!-- Page content (only this scrolls) -->
      <main class="flex-1 p-6 overflow-y-auto">
        <RouterView />
      </main>
    </div>
  </div>
</template>
