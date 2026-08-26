<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { PIPELINE_STATUSES } from '../status'
import { formatCount } from '../format'
import type { PipelineStatusCounts } from '../types'
import AppPipelineStatusChip from '@/shared/components/AppPipelineStatusChip.vue'

defineProps<{
  counts: PipelineStatusCounts
  loading?: boolean
}>()

const { t, locale } = useI18n()
</script>

<template>
  <section class="rounded-[10px] border border-border bg-white p-5 shadow-sm">
    <h2 class="font-display text-sm font-semibold text-text-primary">
      {{ t('pipeline.monitor.breakdownTitle') }}
    </h2>
    <p class="mt-1 font-sans text-xs text-text-secondary">
      {{ t('pipeline.monitor.breakdownHint') }}
    </p>

    <ul class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <li
        v-for="status in PIPELINE_STATUSES"
        :key="status"
        class="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2.5"
      >
        <AppPipelineStatusChip :status="status" size="sm" />
        <span
          v-if="loading"
          class="h-4 w-6 animate-pulse rounded bg-surface-input"
          :aria-label="t('pipeline.monitor.loading')"
        />
        <span v-else class="font-display text-sm font-semibold text-text-primary tabular-nums">
          {{ formatCount(counts[status], locale) }}
        </span>
      </li>
    </ul>
  </section>
</template>
