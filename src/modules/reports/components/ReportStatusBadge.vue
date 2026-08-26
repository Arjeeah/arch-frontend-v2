<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import StatusBadge from '@/shared/components/StatusBadge.vue'
import type { ReportJobStatus } from '../types'

const props = defineProps<{ status: ReportJobStatus }>()

const { t } = useI18n()

/**
 * `StatusBadge` speaks the borrowing vocabulary, so the four job statuses are
 * mapped onto the colour that matches their meaning rather than a new badge
 * component being introduced: green for done, red for failed, amber while the
 * queue still has work to do.
 */
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
  <StatusBadge :status="tone">{{ t(`reports.status.${props.status}`) }}</StatusBadge>
</template>
