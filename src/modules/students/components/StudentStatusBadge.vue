<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Sparkles } from 'lucide-vue-next'
import type { StudentStatus } from '../types'

const props = defineProps<{ status: StudentStatus }>()

const { t } = useI18n()

/**
 * `draft` is the one status that means "a human still has to look at this" —
 * the AI creates draft students from scanned files — so it gets the warning
 * treatment and the only icon.
 */
const tone = computed(() => {
  switch (props.status) {
    case 'draft':
      return 'bg-warning/20 text-warning'
    case 'active':
      return 'bg-success-bg text-success-text'
    case 'graduated':
      return 'bg-highlight text-primary-dark'
    case 'withdrawn':
      return 'bg-danger/10 text-danger'
    default:
      return 'bg-inactive-bg text-inactive-text'
  }
})
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-sans text-xs font-medium"
    :class="tone"
  >
    <Sparkles v-if="status === 'draft'" class="h-3 w-3" />
    {{ t(`students.status.${status}`) }}
  </span>
</template>
