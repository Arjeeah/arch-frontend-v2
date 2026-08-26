<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search, X } from 'lucide-vue-next'
import AppButton from '@/shared/components/AppButton.vue'
import { QUERY_MAX_LENGTH, QUERY_MIN_LENGTH } from '../types'

/**
 * The query box. Submission is explicit — pressing Enter or the button — because
 * every search is an embedding call plus a vector scan, far too expensive to
 * fire on each keystroke.
 */
const props = defineProps<{
  modelValue: string
  loading: boolean
  /** Whether the trimmed query is within the length the backend accepts. */
  valid: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  submit: []
  clear: []
}>()

const { t } = useI18n()

const length = computed(() => props.modelValue.trim().length)

/**
 * Only complain once there is something to complain about.
 *
 * The minimum is passed as `count` rather than `min` on purpose: vue-i18n reads
 * a named `count` as the plural index, which is what lets Arabic answer with the
 * dual ("حرفين") instead of a numeral glued to a plural noun.
 */
const hint = computed(() => {
  if (length.value === 0) return null
  if (length.value < QUERY_MIN_LENGTH) return t('search.form.tooShort', { count: QUERY_MIN_LENGTH })
  if (length.value > QUERY_MAX_LENGTH) return t('search.form.tooLong', { max: QUERY_MAX_LENGTH })
  return null
})

function onInput(event: Event): void {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <form class="flex flex-col gap-2" @submit.prevent="emit('submit')">
    <div class="flex flex-wrap items-center gap-3">
      <!--
        The box is deliberately right-to-left whatever the UI language is: the
        archive holds Arabic documents, so an Arabic query is the normal case and
        typing one into an LTR field puts the caret and punctuation in the wrong
        place. `start-*`/`ps-*` resolve against this wrapper's own direction.
      -->
      <div class="relative min-w-[260px] flex-1" dir="rtl">
        <Search
          class="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted"
        />
        <input
          :value="props.modelValue"
          type="search"
          :aria-label="t('search.form.label')"
          :placeholder="t('search.form.placeholder')"
          :maxlength="QUERY_MAX_LENGTH"
          class="h-[52px] w-full rounded-xl border border-border-dropdown bg-surface-card ps-12 pe-4 text-start font-sans text-base text-text-primary placeholder:font-sans placeholder:text-text-muted focus:border-primary focus:outline-none"
          style="border-width: 1.3px"
          @input="onInput"
        />
      </div>

      <div class="flex items-center gap-2">
        <AppButton
          type="submit"
          variant="primary"
          :loading="props.loading"
          :disabled="!props.valid"
          class="h-[52px] px-6 text-sm"
        >
          {{ t('search.form.submit') }}
        </AppButton>
        <AppButton
          v-if="props.modelValue.length > 0"
          type="button"
          variant="ghost"
          class="h-[52px]"
          @click="emit('clear')"
        >
          <X class="h-4 w-4" />
          {{ t('search.form.clear') }}
        </AppButton>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="font-sans text-xs" :class="hint ? 'text-danger' : 'text-text-secondary'">
        {{ hint ?? t('search.form.hint') }}
      </p>
      <p v-if="length > QUERY_MAX_LENGTH * 0.8" class="font-sans text-xs text-text-muted">
        {{ length }} / {{ QUERY_MAX_LENGTH }}
      </p>
    </div>
  </form>
</template>
