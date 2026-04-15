<script setup lang="ts">
defineProps<{
  status: 'active' | 'inactive' | 'pending' | 'overdue' | 'returned'
}>()
</script>

<template>
  <span
    class="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium font-sans"
    :class="{
      'bg-success-bg text-success-text': status === 'active' || status === 'returned',
      'bg-inactive-bg text-inactive-text': status === 'inactive',
      'bg-warning/20 text-warning': status === 'pending',
      'bg-danger/10 text-danger': status === 'overdue',
    }"
  >
    <slot>{{ status }}</slot>
  </span>
</template>
