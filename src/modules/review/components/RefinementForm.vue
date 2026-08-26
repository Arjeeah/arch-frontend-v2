<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Undo2 } from 'lucide-vue-next'
import FormField from '@/shared/components/FormField.vue'
import FormInput from '@/shared/components/FormInput.vue'
import AppSelect from '@/shared/components/AppSelect.vue'
import AdditionalFieldsEditor from './AdditionalFieldsEditor.vue'
import { IDENTITY_FIELDS } from '../types'
import type { LookupOption, RefinementIdentity, RefinementSnapshot } from '../types'

const props = withDefaults(
  defineProps<{
    modelValue: RefinementIdentity
    /** Faculty names for the college select — see `reviewApi.listFaculties`. */
    faculties: LookupOption[]
    documentTypes: LookupOption[]
    /** What the AI originally extracted, for the per-field "AI said…" hint. */
    aiSnapshot: RefinementSnapshot | null
    disabled?: boolean
    lookupsLoading?: boolean
    /** The college / document-type lookups failed — say so in the placeholder. */
    lookupsFailed?: boolean
  }>(),
  { disabled: false, lookupsLoading: false, lookupsFailed: false },
)

const emit = defineEmits<{ 'update:modelValue': [value: RefinementIdentity] }>()

const { t } = useI18n()

type TextField = (typeof IDENTITY_FIELDS)[number]

function update(field: TextField, value: string): void {
  emit('update:modelValue', { ...props.modelValue, [field]: value })
}

function updateAdditional(value: Record<string, unknown>): void {
  emit('update:modelValue', { ...props.modelValue, additionalFields: value })
}

/** The AI's original answer for a field, or '' when there was no refinement. */
function aiValue(field: TextField): string {
  return props.aiSnapshot?.[field] ?? ''
}

function isChanged(field: TextField): boolean {
  return props.modelValue[field] !== aiValue(field)
}

function revert(field: TextField): void {
  update(field, aiValue(field))
}

/**
 * The extractor answers with free text, so its value may not match any faculty
 * or document type on record. Dropping it would hide exactly the mistake this
 * screen exists to catch — an unrecognised value becomes its own flagged option.
 */
function withExtractedValue(options: LookupOption[], current: string): LookupOption[] {
  if (!current || options.some((option) => option.value === current)) return options
  return [
    { value: current, label: t('review.form.unlistedOption', { value: current }) },
    ...options,
  ]
}

interface FieldSpec {
  field: TextField
  kind: 'text' | 'select'
  options: LookupOption[]
  placeholder: string
}

/**
 * A select whose list never arrived is a dead control, not an empty one — the
 * placeholder has to say which, or the operator reads "No college selected"
 * and assumes the record simply has none.
 */
function selectPlaceholder(emptyLabel: string): string {
  if (props.lookupsLoading) return t('review.form.loadingOptions')
  if (props.lookupsFailed) return t('review.form.optionsUnavailable')
  return emptyLabel
}

/**
 * `enrollmentDate` is deliberately a text input, not `type="date"`: the
 * extractor returns whatever it read off the scan, and a date input silently
 * blanks anything it cannot parse — erasing the very mistake being reviewed.
 */
const fieldSpecs = computed<FieldSpec[]>(() =>
  IDENTITY_FIELDS.map((field) => {
    if (field === 'college') {
      return {
        field,
        kind: 'select',
        options: withExtractedValue(props.faculties, props.modelValue.college),
        placeholder: selectPlaceholder(t('review.form.noCollege')),
      }
    }
    if (field === 'documentType') {
      return {
        field,
        kind: 'select',
        options: withExtractedValue(props.documentTypes, props.modelValue.documentType),
        placeholder: selectPlaceholder(t('review.form.noDocumentType')),
      }
    }
    return {
      field,
      kind: 'text',
      options: [],
      placeholder:
        field === 'enrollmentDate'
          ? t('review.form.datePlaceholder')
          : t('review.form.notExtracted'),
    }
  }),
)
</script>

<template>
  <!--
    A `fieldset` rather than a `div`: `AppSelect` takes no `disabled` prop and
    forwards nothing to its native `<select>`, so the college and document-type
    fields would otherwise stay live while a save is in flight — and an edit
    made in that window is overwritten by the server's answer on success.
    `fieldset[disabled]` disables every descendant control natively, which
    covers them without reaching into `shared/`.
  -->
  <fieldset :disabled="disabled" class="flex min-w-0 flex-col gap-4">
    <FormField
      v-for="spec in fieldSpecs"
      :key="spec.field"
      :label="t(`review.fields.${spec.field}`)"
      :field-id="spec.kind === 'text' ? `review-${spec.field}` : undefined"
    >
      <AppSelect
        v-if="spec.kind === 'select'"
        :model-value="modelValue[spec.field]"
        :options="spec.options"
        :placeholder="spec.placeholder"
        @update:model-value="update(spec.field, $event)"
      />
      <FormInput
        v-else
        :id="`review-${spec.field}`"
        :model-value="modelValue[spec.field]"
        :disabled="disabled"
        :placeholder="spec.placeholder"
        @update:model-value="update(spec.field, $event)"
      />

      <button
        v-if="isChanged(spec.field)"
        type="button"
        class="inline-flex items-center gap-1 self-start font-sans text-xs text-text-secondary transition-colors hover:text-primary"
        :title="t('review.form.revert')"
        @click="revert(spec.field)"
      >
        <Undo2 class="h-3 w-3 shrink-0" />
        <span class="truncate">
          {{ t('review.form.aiSaid', { value: aiValue(spec.field) || t('review.form.blank') }) }}
        </span>
      </button>
    </FormField>

    <div class="border-t border-border pt-4">
      <AdditionalFieldsEditor
        :model-value="modelValue.additionalFields"
        :disabled="disabled"
        @update:model-value="updateAdditional"
      />
    </div>
  </fieldset>
</template>
