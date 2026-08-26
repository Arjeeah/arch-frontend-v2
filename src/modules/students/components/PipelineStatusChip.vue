<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  /** Raw `App\Enums\Pipeline\PipelineStatus` value. */
  status: string
  /** `pipeline_status_label` — the backend's own Arabic wording. */
  label?: string | null
}>()

const { t, te, locale } = useI18n()

const tone = computed(() => {
  switch (props.status) {
    case 'completed':
      return 'bg-success-bg text-success-text'
    case 'failed':
      return 'bg-danger/10 text-danger'
    case 'pending':
      return 'bg-inactive-bg text-inactive-text'
    default:
      // Everything between pending and done is work in progress.
      return 'bg-warning/20 text-warning'
  }
})

const isBusy = computed(() => !['completed', 'failed', 'pending'].includes(props.status))

/**
 * `PipelineStatus::label()` is authored Arabic, so in Arabic we show exactly
 * what the backend says rather than a second, drifting translation. English
 * readers get the local key, and an unknown status falls through to whatever
 * the API called it.
 */
const text = computed(() => {
  if (locale.value.startsWith('ar') && props.label) return props.label
  const key = `students.pipeline.${props.status}`
  if (te(key)) return t(key)
  return props.label || props.status
})
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-sans text-xs font-medium"
    :class="tone"
  >
    <span
      v-if="isBusy"
      class="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-current"
      aria-hidden="true"
    />
    {{ text }}
  </span>
</template>
