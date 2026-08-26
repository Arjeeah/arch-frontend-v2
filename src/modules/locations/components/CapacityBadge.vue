<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { CapacityColor, CapacityStatus } from '../types'

defineProps<{
  status: CapacityStatus
  color: CapacityColor
  /** Raw drawer capacity (slot count). `null` renders a dash. */
  capacity: number | null
}>()

const { t } = useI18n()
</script>

<template>
  <span class="inline-flex items-center gap-2 font-sans text-xs">
    <span
      class="h-2 w-2 shrink-0 rounded-full"
      :class="{
        'bg-success': color === 'green',
        'bg-warning': color === 'yellow',
        'bg-danger': color === 'red',
      }"
    />
    <span
      class="font-medium"
      :class="{
        'text-success-text': color === 'green',
        'text-warning': color === 'yellow',
        'text-danger': color === 'red',
      }"
    >
      {{ t(`locations.capacity.status.${status}`) }}
    </span>
    <span class="text-text-muted">
      &middot; {{ capacity ?? '-' }} {{ t('locations.capacity.slotsSuffix') }}
    </span>
  </span>
</template>
