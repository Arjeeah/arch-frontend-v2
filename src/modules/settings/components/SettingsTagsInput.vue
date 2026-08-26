<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from 'lucide-vue-next'
import type { SettingsSelectOption } from '../settings-field-config'

const props = defineProps<{
  modelValue: string[]
  /** When set, renders a fixed set of toggle chips instead of a free-text input. */
  allowedValues?: SettingsSelectOption[]
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

const { t } = useI18n()
const draft = ref('')

function toggleAllowed(value: string): void {
  const next = props.modelValue.includes(value)
    ? props.modelValue.filter((v) => v !== value)
    : [...props.modelValue, value]
  emit('update:modelValue', next)
}

function addFreeform(): void {
  const value = draft.value.trim().toLowerCase()
  draft.value = ''
  if (!value || props.modelValue.includes(value)) return
  emit('update:modelValue', [...props.modelValue, value])
}

function remove(value: string): void {
  emit(
    'update:modelValue',
    props.modelValue.filter((v) => v !== value),
  )
}
</script>

<template>
  <!-- Fixed set (e.g. OCR languages): toggle chips, no free text — the backend validates against an enum. -->
  <div v-if="allowedValues" class="flex flex-wrap gap-2">
    <button
      v-for="opt in allowedValues"
      :key="opt.value"
      type="button"
      class="px-3 py-1.5 rounded-full text-xs font-display font-medium border transition-colors"
      :class="
        modelValue.includes(opt.value)
          ? 'bg-primary text-white border-primary'
          : 'bg-white text-text-secondary border-border hover:border-primary'
      "
      @click="toggleAllowed(opt.value)"
    >
      {{ t(opt.labelKey) }}
    </button>
  </div>

  <!-- Free text (e.g. file extensions, backup destinations): type and press Enter/comma to add a chip. -->
  <div v-else class="flex flex-col gap-2">
    <div v-if="modelValue.length" class="flex flex-wrap gap-2">
      <span
        v-for="value in modelValue"
        :key="value"
        class="flex items-center gap-1.5 ps-3 pe-2 py-1 rounded-full text-xs font-display font-medium bg-surface text-text-secondary border border-border"
      >
        {{ value }}
        <button type="button" class="hover:text-danger" @click="remove(value)">
          <X class="w-3 h-3" />
        </button>
      </span>
    </div>
    <input
      v-model="draft"
      type="text"
      :placeholder="t('settings.tagsInput.placeholder')"
      class="w-full h-[38px] px-3 bg-white border border-border-dropdown rounded-lg text-xs font-display text-text-input placeholder:text-text-muted focus:outline-none focus:border-primary"
      style="border-width: 1.3px"
      @keydown.enter.prevent="addFreeform"
      @keydown.,.prevent="addFreeform"
      @blur="addFreeform"
    />
  </div>
</template>
