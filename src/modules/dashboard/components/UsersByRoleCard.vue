<script setup lang="ts">
import { computed } from 'vue'
import { Users } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import DashboardCard from './DashboardCard.vue'
import DashboardLinkButton from './DashboardLinkButton.vue'
import { DASHBOARD_LINKS } from '../links'
import { formatNumber } from '../utils/format'
import type { RoleCount } from '../types'

const props = defineProps<{
  rows: RoleCount[]
  loading?: boolean
  error?: string | null
}>()

defineEmits<{ retry: [] }>()

const { t, te, locale } = useI18n()

const total = computed(() => props.rows.reduce((sum, row) => sum + row.count, 0))

/** Translated role name, falling back to the raw slug for an unknown role. */
function roleLabel(role: string): string {
  const key = `dashboard.roles.${role}`
  return te(key) ? t(key) : role
}

/** Share of all users, used for the proportion bar. */
function share(count: number): number {
  return total.value > 0 ? Math.round((count / total.value) * 100) : 0
}
</script>

<template>
  <DashboardCard
    :title="t('dashboard.usersByRole.title')"
    :loading="loading"
    :error="error"
    :empty="!rows.length"
    :empty-title="t('dashboard.usersByRole.empty')"
    :retry-label="t('dashboard.retry')"
    @retry="$emit('retry')"
  >
    <div class="flex flex-col gap-3 flex-1">
      <div v-for="row in rows" :key="row.role" class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between gap-3">
          <span class="text-sm text-text-primary font-sans">{{ roleLabel(row.role) }}</span>
          <span class="text-sm text-text-primary font-display font-medium">
            {{ formatNumber(row.count, locale) }}
          </span>
        </div>
        <div class="h-1.5 w-full rounded-full bg-surface overflow-hidden">
          <div class="h-full rounded-full bg-primary" :style="{ width: `${share(row.count)}%` }" />
        </div>
      </div>
    </div>

    <template #footer>
      <DashboardLinkButton
        :to="DASHBOARD_LINKS.users"
        :label="t('dashboard.usersByRole.cta')"
        :icon="Users"
        :unavailable-hint="t('dashboard.linkUnavailable')"
      />
    </template>
  </DashboardCard>
</template>
