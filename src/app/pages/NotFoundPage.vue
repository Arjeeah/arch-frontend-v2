<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { authStorage } from '@/app/config/authStorage'

const { t } = useI18n()

// Signed-out visitors have nothing to go back to but the login screen.
const isAuthenticated = !!authStorage.getToken()
const backTo = isAuthenticated ? '/dashboard' : '/login'
const backLabel = computed(() =>
  isAuthenticated ? t('notFound.backToDashboard') : t('notFound.backToLogin'),
)
</script>

<template>
  <div class="min-h-screen bg-surface flex items-center justify-center p-6 font-sans">
    <div class="text-center max-w-md">
      <p class="font-display font-semibold text-primary text-7xl leading-none">
        {{ t('notFound.code') }}
      </p>
      <h1 class="mt-4 font-display font-semibold text-2xl text-text-primary">
        {{ t('notFound.title') }}
      </h1>
      <p class="mt-2 text-sm text-text-secondary">{{ t('notFound.description') }}</p>
      <RouterLink
        :to="backTo"
        class="inline-block mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-display font-medium text-white hover:bg-primary-mid transition-colors"
      >
        {{ backLabel }}
      </RouterLink>
    </div>
  </div>
</template>
