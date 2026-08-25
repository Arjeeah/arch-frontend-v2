<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import FormField from '@/shared/components/FormField.vue'
import FormInput from '@/shared/components/FormInput.vue'
import AppSelect from '@/shared/components/AppSelect.vue'
import SettingsTagsInput from './SettingsTagsInput.vue'
import type { SettingsFieldConfig } from '../settings-field-config'

/**
 * One generic renderer, driven entirely by `fields` — this is what every one
 * of the 7 settings groups (`SettingsPage`) is built from. `text` / `number`
 * / `boolean` / `select` / `tags` cover every field except
 * `notifications.perRoleEnableMap`, a nested role -> boolean map rather than
 * a scalar; that one field declares `type: 'custom'` and is rendered through
 * the `#field-<key>` scoped slot instead (see `settings-field-config.ts`).
 */
const props = defineProps<{
  fields: SettingsFieldConfig[]
  modelValue: Record<string, unknown>
}>()

const emit = defineEmits<{ 'update:modelValue': [value: Record<string, unknown>] }>()

const { t } = useI18n()

function update(key: string, value: unknown): void {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

function selectOptions(field: SettingsFieldConfig): { value: string; label: string }[] {
  return (field.options ?? []).map((opt) => ({ value: opt.value, label: t(opt.labelKey) }))
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? (value as string[]) : []
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <div v-for="field in fields" :key="field.key">
      <slot
        :name="`field-${field.key}`"
        :model="modelValue"
        :update="(value: unknown) => update(field.key, value)"
      >
        <!-- Boolean fields render as a labelled toggle row, not a FormField. -->
        <div v-if="field.type === 'boolean'" class="flex items-center justify-between gap-4 py-1">
          <div>
            <p class="text-base font-sans text-text-primary">{{ t(field.labelKey) }}</p>
            <p v-if="field.helperKey" class="text-xs text-text-secondary mt-0.5">
              {{ t(field.helperKey) }}
            </p>
          </div>
          <button
            type="button"
            class="relative inline-flex h-[25px] w-[46px] shrink-0 items-center rounded-[16px] transition-colors focus:outline-none"
            :class="modelValue[field.key] ? 'bg-primary-light' : 'bg-border'"
            @click="update(field.key, !modelValue[field.key])"
          >
            <span
              class="inline-block h-[19px] w-[19px] transform rounded-[16px] bg-white shadow-[0px_3px_7px_rgba(0,0,0,0.12)] transition-transform"
              :class="modelValue[field.key] ? 'translate-x-[24px]' : 'translate-x-[2px]'"
            />
          </button>
        </div>

        <FormField v-else :label="t(field.labelKey)" :field-id="field.key">
          <FormInput
            v-if="field.type === 'text'"
            :id="field.key"
            :model-value="String(modelValue[field.key] ?? '')"
            @update:model-value="update(field.key, $event)"
          />
          <FormInput
            v-else-if="field.type === 'number'"
            :id="field.key"
            type="number"
            :model-value="String(modelValue[field.key] ?? '')"
            @update:model-value="update(field.key, $event === '' ? 0 : Number($event))"
          />
          <AppSelect
            v-else-if="field.type === 'select'"
            :model-value="String(modelValue[field.key] ?? '')"
            :options="selectOptions(field)"
            @update:model-value="update(field.key, $event)"
          />
          <SettingsTagsInput
            v-else-if="field.type === 'tags'"
            :model-value="asStringArray(modelValue[field.key])"
            :allowed-values="field.allowedValues"
            @update:model-value="update(field.key, $event)"
          />
          <p v-if="field.helperKey" class="text-xs text-text-secondary mt-1">
            {{ t(field.helperKey) }}
          </p>
        </FormField>
      </slot>
    </div>
  </div>
</template>
