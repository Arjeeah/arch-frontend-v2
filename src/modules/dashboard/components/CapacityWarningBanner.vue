<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { TriangleAlert } from 'lucide-vue-next'
import { formatPercent } from '../utils/format'
import type { ArchivistCapacityWarning } from '../types'

/**
 * Raised by the archivist dashboard when a physical drawer is at 95% or more.
 * The server also tells us whether an override is allowed; that action lives in
 * the settings module (`POST /v1/settings/storage/override-capacity`), so this
 * banner reports the condition and names where to act rather than firing a
 * mutation the dashboard does not own.
 */
defineProps<{ warning: ArchivistCapacityWarning }>()

const { t, locale } = useI18n()
</script>

<template>
  <div
    v-if="warning.show"
    class="flex items-start gap-3 rounded-[10px] border border-warning/40 bg-warning/10 px-5 py-4"
    role="alert"
  >
    <TriangleAlert class="w-5 h-5 shrink-0 text-warning mt-0.5" />
    <div class="flex flex-col gap-1 min-w-0">
      <p class="text-sm font-display font-medium text-text-primary">
        {{
          t('dashboard.capacityWarning.title', {
            percent: formatPercent(warning.usagePercent, locale),
          })
        }}
      </p>
      <p class="text-xs font-sans text-text-secondary">
        {{
          t('dashboard.capacityWarning.location', {
            cabinet: warning.cabinetName ?? t('dashboard.capacityWarning.unknownCabinet'),
            drawer: warning.drawer ?? t('dashboard.capacityWarning.unknownDrawer'),
          })
        }}
      </p>
      <p v-if="warning.overrideAllowed" class="text-xs font-sans text-text-secondary">
        {{ t('dashboard.capacityWarning.override') }}
      </p>
    </div>
  </div>
</template>
