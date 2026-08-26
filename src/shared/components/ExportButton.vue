<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Download } from 'lucide-vue-next'

/**
 * `label` falls back to a translated default rather than an English literal —
 * the audit page renders this button with no `label` at all, so the literal
 * leaked "Export Report" into the Arabic UI.
 */
const props = withDefaults(
  defineProps<{
    label?: string
    loading?: boolean
    disabled?: boolean
  }>(),
  {
    label: undefined,
    loading: false,
    disabled: false,
  },
)

const { t } = useI18n()

const text = computed(() => props.label ?? t('common.export'))

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
    {{ text }}
  </button>
</template>
