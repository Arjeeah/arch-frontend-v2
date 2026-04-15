<!-- src/modules/dashboard/components/WeeklyDigestCard.vue -->
<script setup lang="ts">
import { weeklyDigest } from '../data/mockDashboard'

const badgeClass: Record<string, string> = {
  danger: 'bg-danger text-white',
  success: 'bg-success text-white',
  primary: 'bg-primary text-white',
  warning: 'bg-warning text-white',
}
</script>

<template>
  <div class="bg-white rounded-[10px] border border-border p-5 shadow-sm flex flex-col gap-4">
    <h3 class="text-sm font-display font-medium text-text-primary">Weekly Digest</h3>
    <div class="flex flex-col gap-3 flex-1">
      <div v-for="item in weeklyDigest" :key="item.label" class="flex items-center justify-between">
        <span class="text-sm text-text-secondary font-sans">{{ item.label }}</span>
        <span
          class="text-xs font-display font-semibold px-2 py-0.5 rounded min-w-[28px] text-center"
          :class="badgeClass[item.color]"
        >
          {{ item.value }}
        </span>
      </div>
    </div>
    <button
      disabled
      class="flex items-center justify-center w-full py-2 rounded-lg bg-primary/40 text-white text-sm font-display font-medium cursor-not-allowed"
    >
      View Full Digest
    </button>
  </div>
</template>
