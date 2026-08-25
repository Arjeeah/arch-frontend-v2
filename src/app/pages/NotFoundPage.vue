<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { authStorage } from '@/app/config/authStorage'

const { t } = useI18n()

/*
 * Rendered inside `DashboardLayout`, so the sidebar and header stay put and
 * the user is never stranded — the link below is a convenience, not the only
 * way out. The signed-out branch is kept for safety: the route requires auth,
 * so in practice a visitor without a token is redirected to login first.
 */
const isAuthenticated = !!authStorage.getToken()
const backTo = isAuthenticated ? '/dashboard' : '/login'
const backLabel = computed(() =>
  isAuthenticated ? t('notFound.backToDashboard') : t('notFound.backToLogin'),
)
</script>

<template>
  <div class="min-h-full flex items-center justify-center py-16 font-sans">
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
