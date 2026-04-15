<script setup lang="ts">
import AppSidebar from '@/shared/components/AppSidebar.vue'
import AppHeader from '@/shared/components/AppHeader.vue'

defineProps<{
  userName?: string
}>()
</script>

<template>
  <div class="flex min-h-screen bg-surface font-sans">
    <!-- Sidebar -->
    <AppSidebar />

    <!-- Main area -->
    <div class="flex flex-col flex-1 min-w-0">
      <!-- Top header -->
      <AppHeader :user-name="userName" />

      <!-- Page content -->
      <main class="flex-1 p-6 overflow-auto">
        <slot />
      </main>
    </div>
  </div>
</template>
