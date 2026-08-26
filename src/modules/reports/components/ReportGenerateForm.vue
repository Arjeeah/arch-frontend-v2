<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileDown } from 'lucide-vue-next'
import AppButton from '@/shared/components/AppButton.vue'
import AppSelect from '@/shared/components/AppSelect.vue'
import FormField from '@/shared/components/FormField.vue'
import ReportFilterField from './ReportFilterField.vue'
import type { GenerateReportInput, ReportFilterValue, ReportTypeOption } from '../types'

const props = defineProps<{
  types: ReportTypeOption[]
  submitting: boolean
}>()

const emit = defineEmits<{ submit: [input: GenerateReportInput] }>()

const { t } = useI18n()

const selectedKey = ref<string>('')
const format = ref<string>('')
const filterValues = reactive<Record<string, string>>({})
const fieldErrors = reactive<Record<string, string>>({})
const typeError = ref('')
const formatError = ref('')

const selectedType = computed<ReportTypeOption | null>(
  () => props.types.find((option) => option.key === selectedKey.value) ?? null,
)

const typeOptions = computed(() =>
  props.types.map((option) => ({
    value: option.key,
    label: t(`reports.types.${option.key}`),
  })),
)

const formatOptions = computed(() =>
  (selectedType.value?.formats ?? []).map((value) => ({
    value,
    label: t(`reports.formats.${value}`),
  })),
)

/**
 * Filters the catalog advertises but the exporter cannot execute.
 *
 * Empty today, and kept as the seam rather than deleted: `filter_schema` comes
 * from the server, so a filter that is advertised and broken can reappear
 * without a frontend change, and this is where it gets withheld.
 *
 * `document_type_id` used to live here. `StudentDocumentsExport::query()` cast
 * it with `(int)` — `(int)'0f3a…'` is `0`, and no row could ever match — so
 * offering the control only produced empty or failed reports. The cast is gone
 * (the query now matches on `(string)` and carries a comment saying not to
 * coerce it), and the filter is verified working end to end against the live
 * API: `student_documents` filtered by a real document-type uuid completes with
 * 36 rows where the unfiltered run has 337. It is offered again, as a uuid text
 * field — see `FIELD_TYPE_OVERRIDES` in `ReportFilterField`, which is what
 * keeps the schema's `integer` label from rendering a number input a uuid
 * cannot be typed into.
 */
const UNSUPPORTED_FILTER_KEYS: readonly string[] = []

/** The filters actually offered — and therefore the only ones ever sent. */
const activeFilterSchema = computed(() =>
  (selectedType.value?.filterSchema ?? []).filter(
    (field) => !UNSUPPORTED_FILTER_KEYS.includes(field.key),
  ),
)

function clearErrors(): void {
  typeError.value = ''
  formatError.value = ''
  for (const key of Object.keys(fieldErrors)) delete fieldErrors[key]
}

/** Picking a type swaps the whole filter set, so the old values are dropped. */
watch(selectedType, (option) => {
  clearErrors()
  for (const key of Object.keys(filterValues)) delete filterValues[key]
  if (!option) {
    format.value = ''
    return
  }
  for (const field of activeFilterSchema.value) filterValues[field.key] = ''
  format.value = option.formats.includes(option.defaultFormat)
    ? option.defaultFormat
    : (option.formats[0] ?? '')
})

/** `"1, 2,3"` → `[1, 2, 3]`; returns null when any entry is not a whole number. */
function parseIdList(raw: string): number[] | null {
  const parts = raw
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '')
  const ids: number[] = []
  for (const part of parts) {
    const value = Number(part)
    if (!Number.isInteger(value) || value <= 0) return null
    ids.push(value)
  }
  return ids
}

/**
 * Client-side mirror of `GenerateReportRequest`: the only cross-field rule it
 * enforces is `date_to >= date_from`, so catching it here saves a round trip.
 */
function validate(): GenerateReportInput | null {
  clearErrors()

  const option = selectedType.value
  if (!option) {
    typeError.value = t('reports.errors.typeRequired')
    return null
  }

  // Narrows the plain-string select value back onto the union, and doubles as
  // the guard for the request's `format ∈ supportedFormats(type)` rule.
  const chosenFormat = option.formats.find((candidate) => candidate === format.value)
  if (!chosenFormat) {
    formatError.value = t('reports.errors.formatRequired')
    return null
  }

  const filters: Record<string, ReportFilterValue> = {}
  let valid = true

  for (const field of activeFilterSchema.value) {
    const raw = (filterValues[field.key] ?? '').trim()
    if (raw === '') continue

    if (field.type === 'array') {
      const ids = parseIdList(raw)
      if (ids === null) {
        fieldErrors[field.key] = t('reports.errors.idList')
        valid = false
        continue
      }
      filters[field.key] = ids
      continue
    }

    filters[field.key] = raw
  }

  const from = typeof filters.date_from === 'string' ? filters.date_from : ''
  const to = typeof filters.date_to === 'string' ? filters.date_to : ''
  if (from && to && to < from) {
    fieldErrors.date_to = t('reports.errors.dateOrder')
    valid = false
  }

  if (!valid) return null

  return { type: option.key, format: chosenFormat, filters }
}

function onSubmit(): void {
  const input = validate()
  if (input) emit('submit', input)
}
</script>

<template>
  <form class="flex flex-col gap-5" @submit.prevent="onSubmit">
    <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
      <FormField
        :label="t('reports.form.type')"
        field-id="report-type"
        :error="typeError || undefined"
      >
        <AppSelect
          v-model="selectedKey"
          :options="typeOptions"
          :placeholder="t('reports.form.typePlaceholder')"
        />
      </FormField>

      <FormField
        :label="t('reports.form.format')"
        field-id="report-format"
        :error="formatError || undefined"
      >
        <AppSelect
          v-model="format"
          :options="formatOptions"
          :placeholder="t('reports.form.formatPlaceholder')"
        />
      </FormField>
    </div>

    <p v-if="selectedType?.requiresFaculty" class="text-xs text-text-secondary font-sans">
      {{ t('reports.form.facultyScopedHint') }}
    </p>

    <div v-if="activeFilterSchema.length" class="flex flex-col gap-3">
      <h3 class="font-display text-sm font-semibold text-text-primary">
        {{ t('reports.form.filters') }}
      </h3>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ReportFilterField
          v-for="field in activeFilterSchema"
          :key="field.key"
          :field="field"
          :model-value="filterValues[field.key] ?? ''"
          :error="fieldErrors[field.key]"
          @update:model-value="filterValues[field.key] = $event"
        />
      </div>
    </div>

    <div class="flex items-center justify-end gap-3">
      <AppButton type="submit" :loading="submitting" :disabled="!selectedType || !format">
        <FileDown class="h-4 w-4" />
        {{ t('reports.form.submit') }}
      </AppButton>
    </div>
  </form>
</template>
