<script setup lang="ts">
import AppSidebar from '@/shared/components/AppSidebar.vue'
import AppHeader from '@/shared/components/AppHeader.vue'

defineProps<{
  userName?: string
}>()
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-surface font-sans">
    <!-- Sidebar (never scrolls) -->
    <AppSidebar />

    <!-- Main area -->
    <div class="flex flex-col flex-1 min-w-0 h-screen">
      <!-- Top header (never scrolls) -->
      <AppHeader :user-name="userName" />

      <!-- Page content (only this scrolls) -->
      <main class="flex-1 p-6 overflow-y-auto">
        <RouterView />
      </main>
    </div>
  </div>
</template>
