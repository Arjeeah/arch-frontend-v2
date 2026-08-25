<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SearchMode } from '../types'

/**
 * Score readout for one hit.
 *
 * The two search modes produce different numbers and the bar must not pretend
 * otherwise: semantic mode returns `1 - cosine_distance`, a real 0..1
 * similarity that reads naturally as a percentage, while keyword mode returns
 * `ts_rank`, an open-ended relevance rank where 0.07 can be the best match in
 * the set. So percentages are shown only for semantic results; keyword results
 * show the raw rank and size their bar against the best score on screen.
 */
const props = withDefaults(
  defineProps<{
    score: number
    mode: SearchMode
    /** Best score in the current result set — the yardstick for keyword mode. */
    maxScore?: number
  }>(),
  { maxScore: 1 },
)

const { t, n } = useI18n()

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value))
}

const fraction = computed(() => {
  if (props.mode === 'semantic') return clamp(props.score)
  return props.maxScore > 0 ? clamp(props.score / props.maxScore) : 0
})

const widthPercent = computed(() => `${(fraction.value * 100).toFixed(1)}%`)

const label = computed(() =>
  props.mode === 'semantic'
    ? t('search.results.match', { percent: Math.round(clamp(props.score) * 100) })
    : t('search.results.rank', { score: n(props.score, { maximumFractionDigits: 3 }) }),
)

/** Weak matches get a muted bar so a 30% hit does not look like a 90% one. */
const barClass = computed(() => {
  if (props.mode === 'keyword') return 'bg-warning'
  if (fraction.value >= 0.75) return 'bg-success'
  if (fraction.value >= 0.5) return 'bg-primary'
  return 'bg-text-muted'
})
</script>

<template>
  <div class="flex items-center gap-2">
    <div
      class="h-1.5 w-24 overflow-hidden rounded-full bg-surface-input"
      role="progressbar"
      :aria-valuenow="Math.round(fraction * 100)"
      :aria-valuemin="0"
      :aria-valuemax="100"
      :aria-label="label"
    >
      <div class="h-full rounded-full" :class="barClass" :style="{ width: widthPercent }" />
    </div>
    <span class="whitespace-nowrap font-sans text-xs text-text-secondary">{{ label }}</span>
  </div>
</template>
