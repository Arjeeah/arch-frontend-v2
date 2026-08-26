<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDialog from '@/shared/components/AppDialog.vue'
import AppSelect from '@/shared/components/AppSelect.vue'
import FormField from '@/shared/components/FormField.vue'
import FormInput from '@/shared/components/FormInput.vue'
import RequirementConditionsBuilder from './RequirementConditionsBuilder.vue'
import type { DocumentType, DocumentTypeInput, RequirementCondition } from '../types'

const props = defineProps<{
  open: boolean
  item?: DocumentType | null
}>()

const emit = defineEmits<{
  close: []
  save: [data: DocumentTypeInput]
}>()

const { t } = useI18n()

const isEdit = computed(() => !!props.item)

const form = reactive({
  name: '',
  description: '',
  isRequired: false,
  status: 'active' as DocumentTypeInput['status'],
})

const hasConditions = ref(false)
const conditionsOperator = ref<'AND' | 'OR'>('AND')
const conditionRows = ref<RequirementCondition[]>([])

const errors = reactive({ name: '', conditions: '' })

const statusOptions = computed(() => [
  { value: 'active', label: t('documentTypes.status.active') },
  { value: 'inactive', label: t('documentTypes.status.inactive') },
])

watch(
  () => props.open,
  (open) => {
    if (!open) return
    const item = props.item
    form.name = item?.name ?? ''
    form.description = item?.description ?? ''
    form.isRequired = item?.isRequired ?? false
    form.status = item?.status ?? 'active'
    hasConditions.value = !!item?.requirementConditions
    conditionsOperator.value = item?.requirementConditions?.operator ?? 'AND'
    // Copy, so editing rows in the builder can never write through to the row
    // object the list is still rendering.
    conditionRows.value = (item?.requirementConditions?.conditions ?? []).map((c) => ({ ...c }))
    errors.name = ''
    errors.conditions = ''
  },
)

/**
 * Mirrors `fromConditionsInput` in the api file: an `in`/`not_in` value is
 * split on commas and the blank parts dropped, so a value of nothing but
 * separators (`",,"`) serialises to `[]` — which fails the backend's
 * `required` rule even though the raw string looked non-empty here.
 */
function hasListValue(condition: RequirementCondition): boolean {
  return condition.value.split(',').some((part) => part.trim())
}

function isListOp(condition: RequirementCondition): boolean {
  return condition.op === 'in' || condition.op === 'not_in'
}

/**
 * `StoreDocumentTypeRequest` marks every `conditions.*.field`/`op`/`value` as
 * `required`, so a half-filled row comes back as a 422 with a
 * `requirement_conditions.conditions.0.field` message that means nothing to
 * the person who typed it. Catch it here instead.
 */
function validate(): boolean {
  errors.name = form.name.trim() ? '' : t('documentTypes.dialog.nameRequired')

  errors.conditions = ''
  if (hasConditions.value) {
    if (conditionRows.value.length === 0) {
      errors.conditions = t('documentTypes.conditions.atLeastOne')
    } else if (conditionRows.value.some((c) => !c.field.trim() || !c.value.trim())) {
      errors.conditions = t('documentTypes.conditions.incomplete')
    } else if (conditionRows.value.some((c) => isListOp(c) && !hasListValue(c))) {
      errors.conditions = t('documentTypes.conditions.emptyList')
    }
  }

  return !errors.name && !errors.conditions
}

function submit() {
  if (!validate()) return
  emit('save', {
    name: form.name.trim(),
    description: form.description.trim() || null,
    isRequired: form.isRequired,
    status: form.status,
    requirementConditions: hasConditions.value
      ? {
          operator: conditionsOperator.value,
          conditions: conditionRows.value.map((c) => ({
            ...c,
            field: c.field.trim(),
            value: c.value.trim(),
          })),
        }
      : null,
  })
}
</script>

<template>
  <AppDialog
    :open="open"
    :title="isEdit ? t('documentTypes.dialog.editTitle') : t('documentTypes.dialog.createTitle')"
    size="lg"
    @close="emit('close')"
  >
    <p class="text-sm font-sans text-[#6F6F6F] mb-5">
      {{
        isEdit ? t('documentTypes.dialog.editSubtitle') : t('documentTypes.dialog.createSubtitle')
      }}
    </p>

    <div class="flex flex-col gap-4">
      <FormField
        :label="t('documentTypes.fields.name')"
        field-id="doc-type-name"
        :error="errors.name"
      >
        <FormInput
          id="doc-type-name"
          v-model="form.name"
          :placeholder="t('documentTypes.dialog.namePlaceholder')"
        />
      </FormField>

      <FormField :label="t('documentTypes.fields.description')" field-id="doc-type-description">
        <textarea
          id="doc-type-description"
          v-model="form.description"
          rows="3"
          maxlength="1000"
          :placeholder="t('documentTypes.dialog.descriptionPlaceholder')"
          class="w-full bg-surface-card border border-border-input rounded-[9px] px-4 py-3 font-sans text-sm text-text-primary placeholder:text-text-placeholder placeholder:font-display placeholder:font-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </FormField>

      <FormField :label="t('documentTypes.fields.status')" field-id="doc-type-status">
        <AppSelect id="doc-type-status" v-model="form.status" :options="statusOptions" />
      </FormField>

      <label class="flex items-center gap-2.5 font-sans text-sm text-text-primary">
        <input
          v-model="form.isRequired"
          type="checkbox"
          class="h-4 w-4 rounded border-border-input accent-primary"
        />
        {{ t('documentTypes.fields.isRequired') }}
      </label>

      <label class="flex items-center gap-2.5 font-sans text-sm text-text-primary">
        <input
          v-model="hasConditions"
          type="checkbox"
          class="h-4 w-4 rounded border-border-input accent-primary"
        />
        {{ t('documentTypes.conditions.enable') }}
      </label>

      <div v-if="hasConditions" class="flex flex-col gap-1.5">
        <RequirementConditionsBuilder
          v-model:operator="conditionsOperator"
          v-model:conditions="conditionRows"
        />
        <p v-if="errors.conditions" class="text-xs text-danger font-sans">
          {{ errors.conditions }}
        </p>
      </div>
    </div>

    <template #footer>
      <button
        type="button"
        class="px-[10.6px] py-[7px] rounded-[4px] bg-[#C0D4E9] text-sm font-sans font-medium text-white transition-opacity hover:opacity-80"
        @click="emit('close')"
      >
        {{ t('documentTypes.dialog.cancel') }}
      </button>
      <button
        type="button"
        class="px-[10.6px] py-[7px] rounded-[4px] bg-primary-mid text-sm font-sans font-medium text-white transition-opacity hover:opacity-80"
        @click="submit"
      >
        {{ isEdit ? t('documentTypes.dialog.update') : t('documentTypes.dialog.save') }}
      </button>
    </template>
  </AppDialog>
</template>
