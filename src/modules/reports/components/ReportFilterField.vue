<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import FormField from '@/shared/components/FormField.vue'
import FormInput from '@/shared/components/FormInput.vue'
import AppSelect from '@/shared/components/AppSelect.vue'
import type { ReportFilterField } from '../types'

const props = defineProps<{
  field: ReportFilterField
  modelValue: string
  error?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { t } = useI18n()

/**
 * Values for the PHP enums named in `filter_schema[].options`.
 *
 * Mirrored from `app/Enums/BorrowingStatus.php` and `app/Enums/UserRole.php`.
 * The catalog endpoint sends the enum's *class name*, not its cases, so the
 * cases have to live here — keep them in step with the backend enums.
 */
const ENUM_OPTIONS: Record<string, readonly string[]> = {
  BorrowingStatus: ['pending', 'approved', 'rejected', 'borrowed', 'returned', 'overdue'],
  UserRole: ['super_admin', 'archivist', 'faculty_staff'],
}

/**
 * Fields the schema calls plain strings but `GenerateReportRequest` (or the
 * column itself) restricts to a fixed set — rendering them as a select is what
 * keeps the request from bouncing back as a 422.
 *
 * - `file_status` → `FileStatus`, hard-validated by `Rule::in`.
 * - `status` (users report) → `UserStatus`. verify against live API: the rule
 *   is a bare `string`, so an unexpected value would be accepted and simply
 *   match nothing.
 * - `role` (audit logs) → the role snapshot `AuditLogService` writes, which is
 *   a `UserRole` value or the literal `system` for machine-made entries.
 */
const STRING_ENUM_BY_KEY: Record<string, readonly string[]> = {
  file_status: ['complete', 'incomplete', 'draft'],
  status: ['active', 'inactive'],
  role: ['super_admin', 'archivist', 'faculty_staff', 'system'],
}

const enumValues = computed<readonly string[] | null>(() => {
  const { type, key, options } = props.field
  if (type === 'enum' && options) return ENUM_OPTIONS[options] ?? null
  if (type === 'string') return STRING_ENUM_BY_KEY[key] ?? null
  return null
})

const selectOptions = computed(() =>
  (enumValues.value ?? []).map((value) => ({
    value,
    label: t(`reports.filterValues.${value}`),
  })),
)

const label = computed(() => t(`reports.filters.${props.field.key}`))

const inputType = computed(() => {
  if (props.field.type === 'date') return 'date'
  if (props.field.type === 'integer') return 'number'
  return 'text'
})

/** Hint for the free-text shapes a user cannot guess (id lists, uuids). */
const hint = computed(() => {
  if (props.field.type === 'array') return t('reports.hints.idList')
  if (props.field.type === 'uuid') return t('reports.hints.uuid')
  return ''
})

const fieldId = computed(() => `report-filter-${props.field.key}`)
</script>

<template>
  <FormField :label="label" :field-id="fieldId" :error="error">
    <AppSelect
      v-if="enumValues"
      :model-value="modelValue"
      :options="selectOptions"
      :placeholder="t('reports.filters.any')"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <FormInput
      v-else
      :id="fieldId"
      :model-value="modelValue"
      :type="inputType"
      :placeholder="hint"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <p v-if="hint && !enumValues" class="text-xs text-text-secondary font-sans">{{ hint }}</p>
  </FormField>
</template>
