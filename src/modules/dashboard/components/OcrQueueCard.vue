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

/**
 * The four states the server folds its eight-state pipeline enum into.
 * `processing` is everything actually in flight — it was missing while this
 * card still read the pre-pipeline three-bucket payload, so a queue that was
 * entirely mid-extraction rendered as four zeros.
 */
const buckets = computed(() => {
  const queue = props.queue
  return [
    { key: 'pending', count: queue?.pending ?? 0, class: 'bg-warning/10 text-warning' },
    { key: 'processing', count: queue?.processing ?? 0, class: 'bg-primary/10 text-primary' },
    { key: 'completed', count: queue?.completed ?? 0, class: 'bg-success-bg text-success-text' },
    { key: 'failed', count: queue?.failed ?? 0, class: 'bg-danger/10 text-danger' },
  ]
})

/**
 * `total` counts today's scans independently of the buckets, so it — not the
 * buckets — answers "did anything happen today?". A document whose
 * `pipeline_status` the server does not recognise is counted in `total` only,
 * which is why an all-zero set of buckets can still sit under a non-zero total.
 */
const scannedToday = computed(() => {
  const queue = props.queue
  if (!queue) return 0
  return Math.max(
    queue.total,
    buckets.value.reduce((sum, bucket) => sum + bucket.count, 0),
  )
})
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
      <div class="grid grid-cols-2 gap-2">
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
        {{
          scannedToday > 0
            ? t(
                'dashboard.ocrQueue.today',
                { count: formatNumber(scannedToday, locale) },
                scannedToday,
              )
            : t('dashboard.ocrQueue.none')
        }}
      </p>
    </div>
  </DashboardCard>
</template>
