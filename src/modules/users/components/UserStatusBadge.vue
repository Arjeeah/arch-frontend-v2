<script setup lang="ts">
defineProps<{ status: 'Active' | 'Inactive' }>()
</script>

<template>
  <span
    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-display font-medium"
    :class="status === 'Active'
      ? 'bg-success-bg text-success-text'
      : 'bg-inactive-bg text-inactive-text'"
  >
    {{ status }}
  </span>
</template>
