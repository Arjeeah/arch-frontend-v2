<!-- src/modules/dashboard/components/RecentActivityTable.vue -->
<script setup lang="ts">
import { recentActivity } from '../data/mockDashboard'

const actionColor: Record<string, string> = {
  'File Borrowed': 'text-primary',
  'File Returned': 'text-success',
  'File Overdue': 'text-danger',
  'OCR Completed': 'text-text-secondary',
}
</script>

<template>
  <div class="bg-white rounded-[10px] border border-border shadow-sm overflow-hidden">
    <div class="px-5 py-4 border-b border-border">
      <h3 class="text-sm font-display font-medium text-text-primary">Recent Activity</h3>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-surface-table">
          <tr>
            <th class="text-left text-xs text-text-muted font-display font-medium px-5 py-3">Action</th>
            <th class="text-left text-xs text-text-muted font-display font-medium px-5 py-3">User</th>
            <th class="text-left text-xs text-text-muted font-display font-medium px-5 py-3">File</th>
            <th class="text-right text-xs text-text-muted font-display font-medium px-5 py-3">Timestamp</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, i) in recentActivity"
            :key="i"
            class="border-t border-border hover:bg-surface transition-colors"
          >
            <td class="px-5 py-3 text-sm font-sans font-medium" :class="actionColor[row.action] ?? 'text-text-primary'">
              {{ row.action }}
            </td>
            <td class="px-5 py-3 text-sm text-text-primary font-sans">{{ row.user }}</td>
            <td class="px-5 py-3 text-sm text-text-secondary font-sans">{{ row.file }}</td>
            <td class="px-5 py-3 text-sm text-text-muted font-sans text-right">{{ row.timestamp }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
