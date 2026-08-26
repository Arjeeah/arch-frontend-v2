<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CONFIDENCE_CRITICAL, CONFIDENCE_THRESHOLD } from '../types'

const props = withDefaults(
  defineProps<{
    /** 0–100, or null when the refinement produced no score. */
    score: number | null
    /** `bar` shows the track; `chip` is the compact pill for dense rows. */
    variant?: 'bar' | 'chip'
    label?: string
  }>(),
  { variant: 'bar', label: '' },
)

const { t, locale } = useI18n()

const clamped = computed(() => {
  if (props.score === null) return null
  return Math.min(100, Math.max(0, props.score))
})

/** Three bands, matching the backend's auto-classification threshold of 85. */
const band = computed<'critical' | 'low' | 'good'>(() => {
  const value = clamped.value
  if (value === null || value < CONFIDENCE_CRITICAL) return 'critical'
  if (value < CONFIDENCE_THRESHOLD) return 'low'
  return 'good'
})

const trackClass = computed(() => {
  if (band.value === 'good') return 'bg-success'
  if (band.value === 'low') return 'bg-warning'
  return 'bg-danger'
})

/**
 * The mid band uses dark text on the amber wash rather than amber-on-amber:
 * `warning` (#FBBC05) against its own 20% tint is about 1.6:1, unreadable at
 * the 12px this chip renders at.
 */
const chipClass = computed(() => {
  if (band.value === 'good') return 'bg-success-bg text-success-text'
  if (band.value === 'low') return 'bg-warning/25 text-text-primary'
  return 'bg-danger/10 text-danger'
})

const formatted = computed(() => {
  if (clamped.value === null) return t('review.confidence.unknown')
  // `numberingSystem` pinned for the same reason as on the page: everything
  // else on this screen renders Western digits, and CLDR's default for `ar`
  // has moved between releases.
  return new Intl.NumberFormat(locale.value, {
    maximumFractionDigits: 0,
    numberingSystem: 'latn',
  }).format(clamped.value)
})

/**
 * The sign comes from the message rather than a hardcoded literal so the
 * chip, the tooltip and the queue filter can never disagree.
 *
 * Arabic writes the percent sign as `٪`, and this screen used to. Every other
 * confidence readout in the app goes through `Intl` with `style: 'percent'`,
 * which emits a Latin `%` — so the same score read `92٪` here and `92%` on
 * `/pipeline/monitor` and the document detail page. Latin wins because it is
 * what `Intl` produces everywhere else.
 */
const display = computed(() =>
  clamped.value === null
    ? formatted.value
    : t('review.confidence.percent', { value: formatted.value }),
)
</script>

<template>
  <span
    v-if="variant === 'chip'"
    class="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 font-sans text-xs font-medium tabular-nums"
    :class="chipClass"
    :title="t('review.confidence.title', { value: formatted })"
  >
    {{ display }}
  </span>

  <div v-else class="flex flex-col gap-1">
    <div class="flex items-baseline justify-between gap-2">
      <span class="font-sans text-xs text-text-secondary">
        {{ label || t('review.confidence.label') }}
      </span>
      <span class="font-display text-sm font-semibold tabular-nums text-text-primary">
        {{ display }}
      </span>
    </div>
    <div
      class="h-1.5 w-full overflow-hidden rounded-full bg-surface-input"
      role="progressbar"
      :aria-valuenow="clamped ?? undefined"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="t('review.confidence.label')"
    >
      <div
        class="h-full rounded-full transition-[width] duration-300"
        :class="trackClass"
        :style="{ width: `${clamped ?? 0}%` }"
      />
    </div>
  </div>
</template>
