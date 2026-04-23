<script setup lang="ts">
import { Download } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    label?: string
    loading?: boolean
    disabled?: boolean
  }>(),
  {
    label: 'Export Report',
    loading: false,
    disabled: false,
  },
)

defineEmits<{ click: [e: MouseEvent] }>()
</script>

<template>
  <button
    type="button"
    :disabled="disabled || loading"
    class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium font-sans rounded-full bg-white border border-border text-text-primary shadow-sm hover:bg-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    @click="$emit('click', $event)"
  >
    <span
      v-if="loading"
      class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
    />
    <Download v-else class="w-4 h-4" />
    {{ label }}
  </button>
</template>
