<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PipelineStatus } from '../types'

/**
 * Deliberately a second copy of the students module's chip: module boundaries
 * forbid importing across `src/modules/`, and `src/shared/` is not this
 * stream's territory. Keep the two in step if the status set changes.
 */
const props = defineProps<{
  status: PipelineStatus
  /** `pipeline_status_label` — the backend's own Arabic wording. */
  label?: string | null
  size?: 'sm' | 'md'
}>()

const { t, locale } = useI18n()

const tone = computed(() => {
  switch (props.status) {
    case 'completed':
      return 'bg-success-bg text-success-text'
    case 'failed':
      return 'bg-danger/10 text-danger'
    case 'pending':
      return 'bg-inactive-bg text-inactive-text'
    default:
      return 'bg-warning/20 text-warning'
  }
})

const isBusy = computed(() => !['completed', 'failed', 'pending'].includes(props.status))

/** Arabic readers get the backend's own label; English readers the local key. */
const text = computed(() => {
  if (locale.value.startsWith('ar') && props.label) return props.label
  return t(`studentDocuments.pipeline.${props.status}`)
})
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full font-sans font-medium"
    :class="[tone, size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs']"
  >
    <span
      v-if="isBusy"
      class="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-current"
      aria-hidden="true"
    />
    {{ text }}
  </span>
</template>
