<script setup lang="ts">
defineProps<{
  modelValue?: string
  type?: string
  placeholder?: string
  id?: string
  disabled?: boolean
}>()

defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <input
    :id="id"
    :type="type ?? 'text'"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    class="w-full bg-surface-card border border-border-input rounded-lg px-4 py-2.5 font-sans text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>
