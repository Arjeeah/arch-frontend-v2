<script setup lang="ts">
import { Settings } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import DashboardCard from './DashboardCard.vue'
import DashboardLinkButton from './DashboardLinkButton.vue'
import { DASHBOARD_LINKS } from '../links'
import type { HealthItem } from '../types'

defineProps<{
  items: HealthItem[]
  loading?: boolean
  error?: string | null
}>()

defineEmits<{ retry: [] }>()

const { t } = useI18n()

const badgeClass: Record<HealthItem['status'], string> = {
  good: 'text-success-text bg-success-bg',
  warning: 'text-warning bg-warning/10',
  danger: 'text-danger bg-danger/10',
  neutral: 'text-text-secondary bg-surface',
}
</script>

<template>
  <DashboardCard
    :title="t('dashboard.systemHealth.title')"
    :loading="loading"
    :error="error"
    :empty="!items.length"
    :empty-title="t('dashboard.systemHealth.empty')"
    :retry-label="t('dashboard.retry')"
    @retry="$emit('retry')"
  >
    <div class="flex flex-col gap-3 flex-1">
      <div v-for="item in items" :key="item.key" class="flex items-center justify-between gap-3">
        <span class="text-sm text-text-secondary font-sans">{{ item.label }}</span>
        <span
          class="text-xs font-display font-medium px-2 py-0.5 rounded"
          :class="badgeClass[item.status]"
        >
          {{ item.value }}
        </span>
      </div>
    </div>

    <template #footer>
      <DashboardLinkButton
        :to="DASHBOARD_LINKS.settings"
        :label="t('dashboard.systemHealth.cta')"
        :icon="Settings"
        :unavailable-hint="t('dashboard.linkUnavailable')"
      />
    </template>
  </DashboardCard>
</template>
