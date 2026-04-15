<script setup lang="ts">
import AppDialog from './AppDialog.vue'

withDefaults(
  defineProps<{
    open: boolean
    title?: string
    message?: string
    confirmLabel?: string
    confirmClass?: string
    size?: 'sm' | 'md' | 'lg'
  }>(),
  {
    title: 'Confirm',
    confirmLabel: 'Confirm',
    confirmClass: 'bg-primary text-white hover:opacity-80',
    size: 'sm',
  },
)

const emit = defineEmits<{ close: []; confirm: [] }>()
</script>

<template>
  <AppDialog :open="open" :title="title" :size="size" @close="emit('close')">
    <slot>
      <p v-if="message" class="text-sm text-text-secondary font-sans">{{ message }}</p>
    </slot>
    <template #footer>
      <button
        class="px-5 py-2 rounded-lg border border-border text-sm font-display font-medium text-text-secondary hover:bg-surface transition-colors"
        @click="emit('close')"
      >
        Cancel
      </button>
      <button
        class="px-5 py-2 rounded-lg text-sm font-display font-medium transition-opacity"
        :class="confirmClass"
        @click="emit('confirm')"
      >
        {{ confirmLabel }}
      </button>
    </template>
  </AppDialog>
</template>
