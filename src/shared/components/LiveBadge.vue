<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string
  }>(),
  {
    label: 'Live',
  },
)
</script>

<template>
  <span
    class="inline-flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium font-sans bg-success-bg text-success-text"
  >
    <span class="w-1.5 h-1.5 rounded-full bg-success-text animate-pulse" />
    {{ label }}
  </span>
</template>
