<script setup lang="ts">
import { Clock } from 'lucide-vue-next'
import type { Activity } from '../types'

defineProps<{ activities: Activity[] }>()

const actionColor: Record<string, string> = {
  'file.view': 'text-success',
  'document.upload': 'text-primary',
}
</script>

<template>
  <div class="bg-white rounded-[10px] border border-border shadow-sm overflow-hidden">
    <div class="px-5 py-4 border-b border-border flex items-center gap-2">
      <Clock class="w-4 h-4 text-text-secondary" />
      <h3 class="text-sm font-display font-medium text-text-primary">Recent Activities (Last 5 Actions)</h3>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-surface-table">
          <tr>
            <th class="text-left px-5 py-3 text-xs font-display font-medium text-text-muted">Timestamp</th>
            <th class="text-left px-5 py-3 text-xs font-display font-medium text-text-muted">Action</th>
            <th class="text-left px-5 py-3 text-xs font-display font-medium text-text-muted">Details</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(activity, i) in activities.slice(0, 5)"
            :key="i"
            class="border-t border-border"
          >
            <td class="px-5 py-3 text-sm text-text-secondary font-sans whitespace-nowrap">{{ activity.timestamp }}</td>
            <td class="px-5 py-3 text-sm font-sans font-medium" :class="actionColor[activity.action] ?? 'text-text-primary'">
              {{ activity.action }}
            </td>
            <td class="px-5 py-3 text-sm text-text-primary font-sans">{{ activity.details }}</td>
          </tr>
          <tr v-if="!activities.length">
            <td colspan="3" class="px-5 py-8 text-center text-sm text-text-muted font-sans">No recent activity.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
