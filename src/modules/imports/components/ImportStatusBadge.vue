<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import StatusBadge from '@/shared/components/StatusBadge.vue'
import type { ImportJobStatus } from '../types'

const props = defineProps<{ status: ImportJobStatus }>()

const { t } = useI18n()

/** Reuses the shared badge's palette: green done, red failed, amber in queue. */
const tone = computed(() => {
  switch (props.status) {
    case 'completed':
      return 'active' as const
    case 'failed':
      return 'overdue' as const
    default:
      return 'pending' as const
  }
})
</script>

<template>
  <StatusBadge :status="tone">{{ t(`imports.status.${props.status}`) }}</StatusBadge>
</template>
