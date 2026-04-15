<!-- src/modules/dashboard/components/StatCard.vue -->
<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  label: string
  value: string | number
  subLabel: string
  icon: Component
}>()
</script>

<template>
  <div class="bg-white rounded-[10px] border border-border p-5 flex items-start justify-between shadow-sm">
    <div class="flex flex-col gap-1">
      <p class="text-xs text-text-secondary font-display font-normal">{{ label }}</p>
      <p class="text-3xl font-display font-semibold text-text-primary leading-tight">{{ value }}</p>
      <p class="text-xs text-text-muted font-sans">{{ subLabel }}</p>
    </div>
    <div class="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
      <component :is="icon" class="w-5 h-5" />
    </div>
  </div>
</template>
