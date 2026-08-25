<script setup lang="ts">
import AppToastHost from '@/shared/components/AppToastHost.vue'
// i18n is available globally via app.use(i18n) in main.ts
</script>

<template>
  <main class="min-h-screen">
    <RouterView />
    <!-- Mounted once here so toasts also reach /login and the 404 page. -->
    <AppToastHost />
  </main>
</template>
