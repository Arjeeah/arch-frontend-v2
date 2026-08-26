<script setup lang="ts">
import { FileText } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import DashboardCard from './DashboardCard.vue'
import DashboardLinkButton from './DashboardLinkButton.vue'
import { DASHBOARD_LINKS } from '../links'
import type { DigestItem } from '../types'

defineProps<{
  items: DigestItem[]
  loading?: boolean
  error?: string | null
}>()

defineEmits<{ retry: [] }>()

const { t } = useI18n()

const badgeClass: Record<DigestItem['tone'], string> = {
  danger: 'bg-danger text-white',
  success: 'bg-success text-white',
  primary: 'bg-primary text-white',
  warning: 'bg-warning text-white',
}
</script>

<template>
  <DashboardCard
    :title="t('dashboard.weeklyDigest.title')"
    :loading="loading"
    :error="error"
    :empty="!items.length"
    :empty-title="t('dashboard.weeklyDigest.empty')"
    :retry-label="t('dashboard.retry')"
    @retry="$emit('retry')"
  >
    <div class="flex flex-col gap-3 flex-1">
      <div v-for="item in items" :key="item.key" class="flex items-center justify-between gap-3">
        <span class="text-sm text-text-secondary font-sans">{{ item.label }}</span>
        <span
          class="text-xs font-display font-semibold px-2 py-0.5 rounded min-w-[28px] text-center"
          :class="badgeClass[item.tone]"
        >
          {{ item.value }}
        </span>
      </div>
    </div>

    <template #footer>
      <DashboardLinkButton
        :to="DASHBOARD_LINKS.reports"
        :label="t('dashboard.weeklyDigest.cta')"
        :icon="FileText"
        :unavailable-hint="t('dashboard.linkUnavailable')"
      />
    </template>
  </DashboardCard>
</template>
