<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import FormField from '@/shared/components/FormField.vue'
import FormInput from '@/shared/components/FormInput.vue'
import AppSelect from '@/shared/components/AppSelect.vue'
import type { ReportFilterField, ReportFilterType } from '../types'

const props = defineProps<{
  field: ReportFilterField
  modelValue: string
  error?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { t, te } = useI18n()

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
 * keeps the request from bouncing back as a 422, or from silently matching
 * nothing.
 *
 * - `file_status` → `FileStatus`, hard-validated by `Rule::in`.
 * - `status` (users report) → `UserStatus`, whose only cases are `active` and
 *   `inactive`. Verified: the request rule really is a bare `string`, so an
 *   unexpected value is *accepted* and then matches no row — a silent empty
 *   report rather than a 422, which is exactly why this select exists.
 * - `role` (audit logs) → the role snapshot `AuditLogService` writes, which is
 *   a `UserRole` value or the literal `system` for machine-made entries. Its
 *   sibling `role` on the *users* report is a real `Rule::in(UserRole)` enum
 *   and is served by `ENUM_OPTIONS` instead, so `system` never reaches it.
 */
const STRING_ENUM_BY_KEY: Record<string, readonly string[]> = {
  file_status: ['complete', 'incomplete', 'draft'],
  status: ['active', 'inactive'],
  role: ['super_admin', 'archivist', 'faculty_staff', 'system'],
}

/**
 * Filter keys whose declared schema type does not match the actual column.
 *
 * `document_type_id` is advertised as `integer` by `ReportType::filterSchema()`
 * — confirmed against a live `GET /v1/reports/types` — but `document_types.id`
 * is a `uuid` (migration `create_document_types_table`) and
 * `GenerateReportRequest` validates the filter as a plain `string`. Rendered as
 * `<input type="number">` the field cannot hold a UUID at all, which makes the
 * filter unusable — so it is treated as a uuid here.
 *
 * The server half is now fixed: `StudentDocumentsExport::query()` matches on
 * `(string) $filters['document_type_id']` and carries a comment saying not to
 * coerce it to an int. So this override is the whole remaining gap, and the
 * filter works end to end. What is still worth fixing upstream is the schema
 * *label*: `filterSchema()` should advertise `uuid`, at which point this
 * override can go.
 */
const FIELD_TYPE_OVERRIDES: Record<string, ReportFilterType> = {
  document_type_id: 'uuid',
}

const fieldType = computed<ReportFilterType>(
  () => FIELD_TYPE_OVERRIDES[props.field.key] ?? props.field.type,
)

const enumValues = computed<readonly string[] | null>(() => {
  const { key, options } = props.field
  if (fieldType.value === 'enum' && options) return ENUM_OPTIONS[options] ?? null
  if (fieldType.value === 'string') return STRING_ENUM_BY_KEY[key] ?? null
  return null
})

/**
 * Role slugs read their label from `common.roles.*`, the one set the whole app
 * uses — `/dashboard`, `/users`, `/settings` and this dropdown used to carry
 * four different Arabic names for `super_admin`. Everything else (statuses,
 * file states) stays in `reports.filterValues.*`.
 */
const selectOptions = computed(() =>
  (enumValues.value ?? []).map((value) => ({
    value,
    label: te(`common.roles.${value}`)
      ? t(`common.roles.${value}`)
      : t(`reports.filterValues.${value}`),
  })),
)

const label = computed(() => t(`reports.filters.${props.field.key}`))

const inputType = computed(() => {
  if (fieldType.value === 'date') return 'date'
  if (fieldType.value === 'integer') return 'number'
  return 'text'
})

/** Hint for the free-text shapes a user cannot guess (id lists, uuids). */
const hint = computed(() => {
  if (fieldType.value === 'array') return t('reports.hints.idList')
  if (fieldType.value === 'uuid') return t('reports.hints.uuid')
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
