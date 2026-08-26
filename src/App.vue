<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppToastHost from '@/shared/components/AppToastHost.vue'

// `shared/` cannot reach the i18n plugin (boundaries rule), so components
// there take translated strings as props and the shell supplies them.
const { t } = useI18n()
</script>

<template>
  <main class="min-h-screen">
    <RouterView />
    <!-- Mounted once here so toasts also reach /login and the 404 page. -->
    <AppToastHost :close-label="t('common.dismissNotification')" />
  </main>
</template>
