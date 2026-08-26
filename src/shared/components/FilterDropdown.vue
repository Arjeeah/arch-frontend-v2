<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDown } from 'lucide-vue-next'

const props = defineProps<{
  modelValue?: string
  options: Array<{ label: string; value: string }>
  placeholder?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { t } = useI18n()

const open = ref(false)
const wrapper = ref<HTMLElement | null>(null)
const selectedLabel = () =>
  props.options.find((o) => o.value === props.modelValue)?.label ??
  props.placeholder ??
  t('common.select')

function select(value: string) {
  emit('update:modelValue', value)
  open.value = false
}

function handleClickOutside(e: MouseEvent) {
  if (wrapper.value && !wrapper.value.contains(e.target as Node)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))
</script>

<template>
  <div ref="wrapper" class="relative">
    <button
      type="button"
      class="flex items-center justify-between gap-2 w-full border border-border-dropdown rounded-lg px-4 py-2 font-display text-xs font-medium text-text-primary bg-surface-card"
      @click="open = !open"
    >
      <span>{{ selectedLabel() }}</span>
      <ChevronDown class="w-4 h-4 text-text-primary shrink-0" />
    </button>

    <div
      v-if="open"
      class="absolute z-10 w-full top-full mt-1 bg-surface-card border border-border-dropdown rounded-lg overflow-hidden shadow-sm"
    >
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="w-full text-start px-4 py-2.5 font-display text-xs font-medium text-text-primary hover:bg-surface transition-colors"
        @click="select(option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>
