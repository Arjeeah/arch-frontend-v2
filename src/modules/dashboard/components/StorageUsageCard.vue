<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { TriangleAlert } from 'lucide-vue-next'
import type { DashboardWarning, StorageUsage } from '../types'
import { formatPercent, isolate } from '../utils/format'

const props = defineProps<{
  storage: StorageUsage
  warnings: DashboardWarning[]
}>()

const { t, te, locale } = useI18n()

/** Matches `dashboard.storage_warning_threshold` (60%) on the server. */
const WARNING_AT = 60
const CRITICAL_AT = 90

const percent = computed(() => Math.min(100, Math.max(0, props.storage.percentage)))

const level = computed<'ok' | 'warning' | 'critical'>(() => {
  if (percent.value >= CRITICAL_AT) return 'critical'
  if (percent.value >= WARNING_AT) return 'warning'
  return 'ok'
})

const barClass = computed(
  () =>
    ({
      ok: 'bg-primary',
      warning: 'bg-warning',
      critical: 'bg-danger',
    })[level.value],
)

const percentClass = computed(
  () =>
    ({
      ok: 'text-text-primary',
      warning: 'text-warning',
      critical: 'text-danger',
    })[level.value],
)

/**
 * `DashboardService::getWarnings()` builds its `message` as an English
 * sentence ("Storage capacity is at 64%. Consider reviewing capacity."), so
 * rendering it raw drops English prose into the Arabic UI. The `type` slug is
 * stable and the percentage is already on this card, so a known warning is
 * re-rendered from the fragment — the same `te()`-guarded lookup
 * `RecentActivityTable` uses for audit actions. A type we have no translation
 * for still falls back to the server's sentence, which is better than hiding
 * an operational warning.
 */
function warningText(warning: DashboardWarning): string {
  const key = `dashboard.warnings.${warning.type}`
  if (!te(key)) return warning.message
  return t(key, { percent: formatPercent(percent.value, locale.value) })
}
</script>

<template>
  <div class="flex flex-col gap-4 flex-1">
    <div class="flex items-end justify-between gap-3">
      <p class="text-3xl font-display font-semibold leading-none" :class="percentClass">
        {{ formatPercent(percent, locale) }}
      </p>
      <!-- Isolated: "1.3 TB" inside an Arabic line otherwise renders "TB 1.3". -->
      <p class="text-xs font-sans text-text-secondary text-end">
        {{
          t('dashboard.storage.usedOfTotal', {
            used: isolate(storage.usedFormatted),
            total: isolate(storage.totalFormatted),
          })
        }}
      </p>
    </div>

    <div class="h-2 w-full rounded-full bg-surface overflow-hidden" role="presentation">
      <div
        class="h-full rounded-full transition-all"
        :class="barClass"
        :style="{ width: `${percent}%` }"
      />
    </div>

    <ul v-if="warnings.length" class="flex flex-col gap-2">
      <li
        v-for="warning in warnings"
        :key="warning.type"
        class="flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2"
      >
        <TriangleAlert class="w-4 h-4 shrink-0 text-warning mt-0.5" />
        <span class="text-xs font-sans text-text-primary">{{ warningText(warning) }}</span>
      </li>
    </ul>
    <p v-else class="text-xs font-sans text-text-secondary">
      {{ t('dashboard.storage.noWarnings') }}
    </p>
  </div>
</template>
