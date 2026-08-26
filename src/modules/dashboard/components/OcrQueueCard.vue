<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import DashboardCard from './DashboardCard.vue'
import { formatNumber } from '../utils/format'
import type { OcrQueue } from '../types'

const props = defineProps<{
  queue: OcrQueue | null
  loading?: boolean
  error?: string | null
}>()

defineEmits<{ retry: [] }>()

const { t, locale } = useI18n()

const buckets = computed(() => {
  const queue = props.queue
  return [
    { key: 'pending', count: queue?.pending ?? 0, class: 'bg-warning/10 text-warning' },
    { key: 'completed', count: queue?.completed ?? 0, class: 'bg-success-bg text-success-text' },
    { key: 'failed', count: queue?.failed ?? 0, class: 'bg-danger/10 text-danger' },
  ]
})

/**
 * The server can only ever answer zeros here: `getOcrQueueToday()` bails out
 * unless `student_documents.ocr_status` exists, and the pipeline migrations
 * never created that column. Showing "0 / 0 / 0" as if it were a real quiet day
 * would be a lie, so an all-zero payload is labelled as "no data reported".
 */
const hasData = computed(() => buckets.value.some((bucket) => bucket.count > 0))
</script>

<template>
  <DashboardCard
    :title="t('dashboard.ocrQueue.title')"
    :loading="loading"
    :error="error"
    :retry-label="t('dashboard.retry')"
    @retry="$emit('retry')"
  >
    <div class="flex flex-col gap-3 flex-1">
      <div class="grid grid-cols-3 gap-2">
        <div
          v-for="bucket in buckets"
          :key="bucket.key"
          class="flex flex-col items-center gap-1 rounded-lg px-2 py-3"
          :class="bucket.class"
        >
          <span class="text-xl font-display font-semibold leading-none">
            {{ formatNumber(bucket.count, locale) }}
          </span>
          <span class="text-[11px] font-sans">{{ t(`dashboard.ocrQueue.${bucket.key}`) }}</span>
        </div>
      </div>

      <p class="text-xs font-sans text-text-secondary">
        {{ hasData ? t('dashboard.ocrQueue.today') : t('dashboard.ocrQueue.unavailable') }}
      </p>
    </div>
  </DashboardCard>
</template>
