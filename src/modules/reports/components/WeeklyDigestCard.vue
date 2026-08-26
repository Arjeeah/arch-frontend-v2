<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalendarClock, Database, Hourglass, TriangleAlert } from 'lucide-vue-next'
import AppStatCard from '@/shared/components/AppStatCard.vue'
import AppErrorState from '@/shared/components/AppErrorState.vue'
import type { WeeklyDigest } from '../types'

const props = defineProps<{
  digest: WeeklyDigest | null
  loading: boolean
  error: string | null
}>()

const emit = defineEmits<{ retry: [] }>()

const { t, locale } = useI18n()

const numberFormat = computed(() => new Intl.NumberFormat(locale.value))

const percentFormat = computed(
  () => new Intl.NumberFormat(locale.value, { style: 'percent', maximumFractionDigits: 1 }),
)

const cards = computed(() => {
  const digest = props.digest
  if (!digest) return []
  return [
    {
      key: 'overdue',
      label: t('reports.digest.overdue'),
      value: numberFormat.value.format(digest.overdueFilesCount),
      icon: TriangleAlert,
    },
    {
      key: 'dueSoon',
      label: t('reports.digest.dueSoon'),
      value: numberFormat.value.format(digest.dueIn7DaysCount),
      icon: Hourglass,
    },
    {
      key: 'weekly',
      label: t('reports.digest.weeklyBorrowings'),
      value: numberFormat.value.format(digest.weeklyBorrowingCount),
      icon: CalendarClock,
    },
    {
      key: 'storage',
      // The API sends a whole-number percentage (e.g. 42.5), so it is divided
      // back down for Intl's percent style.
      label: t('reports.digest.storage'),
      value: percentFormat.value.format(digest.storageUsagePercent / 100),
      icon: Database,
    },
  ]
})
</script>

<template>
  <section class="flex flex-col gap-4">
    <div class="flex flex-col gap-1">
      <h2 class="font-display text-lg font-semibold text-text-primary">
        {{ t('reports.digest.title') }}
      </h2>
      <p class="text-sm text-text-secondary font-sans">{{ t('reports.digest.description') }}</p>
    </div>

    <div v-if="loading" class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="index in 4"
        :key="index"
        class="h-[104px] animate-pulse rounded-[10px] border border-border bg-surface"
      />
    </div>

    <AppErrorState
      v-else-if="error"
      compact
      :title="t('reports.digest.errorTitle')"
      :description="error"
      :retry-label="t('reports.actions.retry')"
      @retry="emit('retry')"
    />

    <div v-else-if="digest" class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <AppStatCard
        v-for="card in cards"
        :key="card.key"
        :label="card.label"
        :value="card.value"
        :icon="card.icon"
      />
    </div>
  </section>
</template>
