<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * One document's position in the extraction pipeline.
 *
 * There used to be three copies of this — `pipeline`, `students` and
 * `student-documents` each carried one, with its own i18n namespace, because
 * modules may not import each other and `src/shared/` was another stream's
 * territory during the merge. They had already drifted: `pending` read
 * "Pending" on the monitor and "Queued" on the two document screens, and
 * `completed` read "Completed" against "Complete", so an operator
 * cross-referencing the two saw two vocabularies for one state.
 *
 * Labels live under `common.pipelineStatus.*`, keyed by the raw
 * `App\Enums\Pipeline\PipelineStatus` value.
 */
const props = withDefaults(
  defineProps<{
    /** Raw `PipelineStatus` value. Typed loosely so an unknown state still renders. */
    status: string
    /** `pipeline_status_label` — the backend's own Arabic wording for this state. */
    apiLabel?: string | null
    size?: 'sm' | 'md'
  }>(),
  { apiLabel: null, size: 'md' },
)

const { t, te, locale } = useI18n()

type Tone = 'neutral' | 'progress' | 'waiting' | 'success' | 'danger'

const TONE_BY_STATUS: Record<string, Tone> = {
  pending: 'neutral',
  ocr_processing: 'progress',
  ocr_completed: 'waiting',
  refining: 'progress',
  refined: 'waiting',
  embedding: 'progress',
  completed: 'success',
  failed: 'danger',
}

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-inactive-bg text-inactive-text',
  progress: 'bg-warning/20 text-warning',
  waiting: 'bg-primary/10 text-primary',
  success: 'bg-success-bg text-success-text',
  danger: 'bg-danger/10 text-danger',
}

/** Anything between pending and done is work in progress. */
const tone = computed<Tone>(() => TONE_BY_STATUS[props.status] ?? 'progress')

/**
 * In Arabic the API's own label wins: `PipelineStatus::label()` is authored
 * Arabic, and preferring it means a wording the backend changes shows up here
 * without a frontend release. In English it would drop a line of Arabic into an
 * otherwise English table, so the bundled translation wins — and an unknown
 * status falls through to whatever the API called it.
 */
const label = computed(() => {
  if (locale.value.startsWith('ar') && props.apiLabel) return props.apiLabel
  const key = `common.pipelineStatus.${props.status}`
  if (te(key)) return t(key)
  return props.apiLabel || props.status
})
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full font-sans font-medium whitespace-nowrap"
    :class="[TONE_CLASSES[tone], size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs']"
  >
    <span
      class="h-1.5 w-1.5 shrink-0 rounded-full bg-current"
      :class="{ 'animate-pulse': tone === 'progress' }"
      aria-hidden="true"
    />
    {{ label }}
  </span>
</template>
