<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDialog from './AppDialog.vue'

/**
 * Every label is optional and falls back to a translated default. The
 * hardcoded English ones this replaced showed through on every module's
 * confirm dialogs under `dir="rtl"` — most visibly the cancel button, which
 * had no prop to override it at all.
 */
const props = defineProps<{
  open: boolean
  title?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  confirmClass?: string
  size?: 'sm' | 'md' | 'lg'
}>()

const emit = defineEmits<{ close: []; confirm: [] }>()

const { t } = useI18n()

const dialogTitle = computed(() => props.title ?? t('common.confirm'))
const confirmText = computed(() => props.confirmLabel ?? t('common.confirm'))
const cancelText = computed(() => props.cancelLabel ?? t('common.cancel'))
const confirmClasses = computed(
  () => props.confirmClass ?? 'bg-primary text-white hover:opacity-80',
)
const dialogSize = computed(() => props.size ?? 'sm')
</script>

<template>
  <AppDialog :open="open" :title="dialogTitle" :size="dialogSize" @close="emit('close')">
    <slot>
      <p v-if="message" class="text-sm text-text-secondary font-sans">{{ message }}</p>
    </slot>
    <template #footer>
      <button
        class="px-5 py-2 rounded-lg border border-border text-sm font-display font-medium text-text-secondary hover:bg-surface transition-colors"
        @click="emit('close')"
      >
        {{ cancelText }}
      </button>
      <button
        class="px-5 py-2 rounded-lg text-sm font-display font-medium transition-opacity"
        :class="confirmClasses"
        @click="emit('confirm')"
      >
        {{ confirmText }}
      </button>
    </template>
  </AppDialog>
</template>
