<!-- src/modules/dashboard/components/SystemHealthCard.vue -->
<script setup lang="ts">
import { Settings } from 'lucide-vue-next'
import { systemHealth } from '../data/mockDashboard'

const badgeClass: Record<string, string> = {
  good: 'text-success bg-success-bg',
  warning: 'text-warning bg-warning/10',
  neutral: 'text-text-secondary bg-surface',
}
</script>

<template>
  <div class="bg-white rounded-[10px] border border-border p-5 shadow-sm flex flex-col gap-4">
    <h3 class="text-sm font-display font-medium text-text-primary">System Health</h3>
    <div class="flex flex-col gap-3 flex-1">
      <div v-for="item in systemHealth" :key="item.label" class="flex items-center justify-between">
        <span class="text-sm text-text-secondary font-sans">{{ item.label }}</span>
        <span
          class="text-xs font-display font-medium px-2 py-0.5 rounded"
          :class="badgeClass[item.status]"
        >
          {{ item.value }}
        </span>
      </div>
    </div>
    <button
      disabled
      class="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-primary/40 text-white text-sm font-display font-medium cursor-not-allowed"
    >
      <Settings class="w-4 h-4" />
      System Settings
    </button>
  </div>
</template>
