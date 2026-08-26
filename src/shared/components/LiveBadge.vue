<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(defineProps<{ label?: string }>(), { label: undefined })

const { t } = useI18n()

const text = computed(() => props.label ?? t('common.live'))
</script>

<template>
  <span
    class="inline-flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium font-sans bg-success-bg text-success-text"
  >
    <span class="w-1.5 h-1.5 rounded-full bg-success-text animate-pulse" />
    {{ text }}
  </span>
</template>
