<script setup lang="ts">
import type { BorrowingStatus } from '../types'

defineProps<{ status: BorrowingStatus }>()
</script>

<template>
  <span
    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-display font-medium capitalize"
    :class="{
      'bg-warning/20 text-warning': status === 'pending',
      'bg-primary/10 text-primary': status === 'approved',
      'bg-success-bg text-success-text': status === 'borrowed',
      'bg-inactive-bg text-inactive-text': status === 'returned',
      'bg-danger/10 text-danger': status === 'rejected',
      'bg-danger text-white': status === 'overdue',
    }"
  >
    {{ status }}
  </span>
</template>
