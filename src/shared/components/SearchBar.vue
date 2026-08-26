<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search } from 'lucide-vue-next'

const props = defineProps<{
  modelValue?: string
  placeholder?: string
}>()
defineEmits<{ 'update:modelValue': [value: string] }>()

const { t } = useI18n()

const placeholderText = computed(() => props.placeholder ?? t('common.searchPlaceholder'))
</script>

<template>
  <div class="flex items-center gap-2 bg-surface-input rounded-xl px-3 py-2">
    <Search class="w-5 h-5 text-text-placeholder shrink-0" />
    <input
      :value="modelValue"
      :placeholder="placeholderText"
      class="flex-1 bg-transparent font-sans text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
  </div>
</template>
