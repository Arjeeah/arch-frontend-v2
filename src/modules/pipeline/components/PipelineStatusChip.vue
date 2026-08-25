<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { toneFor, type PipelineStatus, type PipelineStatusTone } from '../status'

const props = withDefaults(
  defineProps<{
    status: PipelineStatus
    /**
     * `pipeline_status_label` straight off the API — the backend's own Arabic
     * wording for this state. Preferred over the bundled translation whenever
     * the interface is already in Arabic, so a label the backend changes shows
     * up here without a frontend release.
     */
    apiLabel?: string | null
    size?: 'sm' | 'md'
  }>(),
  { apiLabel: null, size: 'md' },
)

const { t, locale } = useI18n()

const tone = computed<PipelineStatusTone>(() => toneFor(props.status))

/**
 * In Arabic the API's label is authoritative. In English it would drop a line
 * of Arabic into an otherwise English table, so the bundled translation wins —
 * the raw API label stays visible in the expanded row detail either way, which
 * is where any drift between the two would show up.
 */
const label = computed(() =>
  locale.value === 'ar' && props.apiLabel ? props.apiLabel : t(`pipeline.status.${props.status}`),
)

const TONE_CLASSES: Record<PipelineStatusTone, string> = {
  neutral: 'bg-inactive-bg text-inactive-text',
  progress: 'bg-warning/20 text-warning',
  waiting: 'bg-primary/10 text-primary',
  success: 'bg-success-bg text-success-text',
  danger: 'bg-danger/10 text-danger',
}
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full font-sans font-medium whitespace-nowrap"
    :class="[TONE_CLASSES[tone], size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs']"
  >
    <span
      class="h-1.5 w-1.5 shrink-0 rounded-full bg-current"
      :class="{ 'animate-pulse': tone === 'progress' }"
    />
    {{ label }}
  </span>
</template>
