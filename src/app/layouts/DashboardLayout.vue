<script setup lang="ts">
import AppSidebar from '@/shared/components/AppSidebar.vue'
import AppHeader from '@/shared/components/AppHeader.vue'
import { useAuthStore } from '@/modules/auth/store/useAuthStore'
import { useRouter } from 'vue-router'

defineProps<{
  userName?: string
}>()

const authStore = useAuthStore()
const router = useRouter()

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-surface font-sans">
    <!-- Sidebar (never scrolls) -->
    <AppSidebar />

    <!-- Main area -->
    <div class="flex flex-col flex-1 min-w-0 h-screen">
      <!-- Top header (never scrolls) -->
      <AppHeader :user-name="userName" @logout="handleLogout" />

      <!-- Page content (only this scrolls) -->
      <main class="flex-1 p-6 overflow-y-auto">
        <RouterView />
      </main>
    </div>
  </div>
</template>
