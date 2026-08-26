<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'

interface Option {
  value: string
  label: string
}

withDefaults(
  defineProps<{
    modelValue: string
    options: Option[]
    placeholder?: string
    placeholderDisabled?: boolean
  }>(),
  { placeholder: '', placeholderDisabled: false },
)

defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div class="relative">
    <select
      :value="modelValue"
      class="w-full h-[42px] ps-[18px] pe-10 bg-white border border-border-dropdown rounded-[8px] text-xs font-display font-medium text-[#313144] focus:outline-none appearance-none cursor-pointer"
      style="border-width: 1.3px"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option v-if="placeholder" :value="''" :disabled="placeholderDisabled">
        {{ placeholder }}
      </option>
      <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>
    <ChevronDown
      class="absolute end-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none text-[#313144]"
    />
  </div>
</template>
