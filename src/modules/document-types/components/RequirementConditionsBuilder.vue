<script setup lang="ts">
import { computed } from 'vue'
import { Plus, Trash2 } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import AppSelect from '@/shared/components/AppSelect.vue'
import FormInput from '@/shared/components/FormInput.vue'
import { CONDITION_FIELDS, type ConditionOperator, type RequirementCondition } from '../types'

/**
 * `requirement_conditions` builder: an operator (`AND`/`OR`) joining a list
 * of `{ field, op, value }` rows — mirrors `StoreDocumentTypeRequest`'s
 * `requirement_conditions.*` rules exactly: `op` and `field` are both closed
 * enums server-side, only `value` is free text.
 */
const props = defineProps<{
  operator: 'AND' | 'OR'
  conditions: RequirementCondition[]
}>()

const emit = defineEmits<{
  'update:operator': [value: 'AND' | 'OR']
  'update:conditions': [value: RequirementCondition[]]
}>()

const { t } = useI18n()

// `computed`, not plain arrays: `t()` read once at setup freezes the labels in
// whichever locale happened to be active, and the header's language switch does
// not remount this dialog.
const operatorOptions = computed(() => [
  { value: 'AND', label: t('documentTypes.conditions.and') },
  { value: 'OR', label: t('documentTypes.conditions.or') },
])

const opOptions = computed<{ value: ConditionOperator; label: string }[]>(() => [
  { value: '=', label: '=' },
  { value: '!=', label: '!=' },
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '>=', label: '>=' },
  { value: '<=', label: '<=' },
  { value: 'in', label: t('documentTypes.conditions.opIn') },
  { value: 'not_in', label: t('documentTypes.conditions.opNotIn') },
])

/**
 * `field` is a closed list server-side (`Rule::in(evaluableFields())`), so it
 * is a select rather than the free-text input it used to be — typing anything
 * else came back as a 422 quoting the wire path,
 * `The selected requirement_conditions.conditions.0.field is invalid.`
 *
 * A row stored before the whitelist closed can still name something outside it.
 * That value is appended as its own option rather than dropped: a native
 * `<select>` shows nothing for an unknown `value`, which would read as "this
 * rule has no field" and invite the reviewer to overwrite it — and the backend
 * accepts an untouched legacy field precisely because it is unchanged.
 */
function fieldOptions(condition: RequirementCondition) {
  const options = CONDITION_FIELDS.map((value) => ({ value, label: value }))
  const current = condition.field
  if (current && !(CONDITION_FIELDS as readonly string[]).includes(current)) {
    options.push({ value: current, label: current } as (typeof options)[number])
  }
  return options
}

function addCondition() {
  emit('update:conditions', [...props.conditions, { field: '', op: '=', value: '' }])
}

function removeCondition(index: number) {
  emit(
    'update:conditions',
    props.conditions.filter((_, i) => i !== index),
  )
}

function updateCondition(index: number, patch: Partial<RequirementCondition>) {
  emit(
    'update:conditions',
    props.conditions.map((condition, i) => (i === index ? { ...condition, ...patch } : condition)),
  )
}
</script>

<template>
  <div class="flex flex-col gap-3 rounded-[9px] border border-border-input p-4">
    <div class="flex items-center gap-3">
      <span class="text-sm font-sans text-text-secondary shrink-0">
        {{ t('documentTypes.conditions.matchLabel') }}
      </span>
      <div class="w-32">
        <AppSelect
          :model-value="operator"
          :options="operatorOptions"
          @update:model-value="(v) => emit('update:operator', v as 'AND' | 'OR')"
        />
      </div>
      <span class="text-sm font-sans text-text-secondary">
        {{ t('documentTypes.conditions.ofTheFollowing') }}
      </span>
    </div>

    <div v-for="(condition, index) in conditions" :key="index" class="flex items-start gap-2">
      <div class="flex-1 min-w-0">
        <AppSelect
          :model-value="condition.field"
          :options="fieldOptions(condition)"
          :placeholder="t('documentTypes.conditions.fieldPlaceholder')"
          placeholder-disabled
          @update:model-value="(v) => updateCondition(index, { field: v })"
        />
      </div>
      <div class="w-28 shrink-0">
        <AppSelect
          :model-value="condition.op"
          :options="opOptions"
          @update:model-value="(v) => updateCondition(index, { op: v as ConditionOperator })"
        />
      </div>
      <div class="flex-1 min-w-0">
        <FormInput
          :model-value="condition.value"
          :placeholder="
            condition.op === 'in' || condition.op === 'not_in'
              ? t('documentTypes.conditions.valueListPlaceholder')
              : t('documentTypes.conditions.valuePlaceholder')
          "
          @update:model-value="(v) => updateCondition(index, { value: v })"
        />
      </div>
      <button
        type="button"
        class="mt-3 shrink-0 text-danger hover:opacity-70 transition-opacity"
        :title="t('documentTypes.conditions.remove')"
        @click="removeCondition(index)"
      >
        <Trash2 class="w-5 h-5" />
      </button>
    </div>

    <button
      type="button"
      class="inline-flex w-fit items-center gap-1.5 text-sm font-sans font-medium text-primary hover:opacity-80 transition-opacity"
      @click="addCondition"
    >
      <Plus class="w-4 h-4" />
      {{ t('documentTypes.conditions.addCondition') }}
    </button>
  </div>
</template>
