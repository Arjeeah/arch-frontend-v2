<!-- src/modules/dashboard/components/RecentActivityTable.vue -->
<script setup lang="ts">
import DataTable from '@/shared/components/DataTable.vue'
import { recentActivity } from '../data/mockDashboard'

const columns = [
  { key: 'action', label: 'Action', align: 'left' as const },
  { key: 'user', label: 'User', align: 'left' as const },
  { key: 'file', label: 'File', align: 'left' as const },
  { key: 'timestamp', label: 'Timestamp', align: 'right' as const },
]

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
    <DataTable :columns="columns">
      <template #rows>
        <tr
          v-for="row in recentActivity"
          :key="`${row.action}-${row.user}-${row.timestamp}`"
          class="border-t border-border hover:bg-surface transition-colors"
        >
          <td
            class="px-5 py-3 text-sm font-sans font-medium"
            :class="actionColor[row.action] ?? 'text-text-primary'"
          >
            {{ row.action }}
          </td>
          <td class="px-5 py-3 text-sm text-text-primary font-sans">{{ row.user }}</td>
          <td class="px-5 py-3 text-sm text-text-secondary font-sans">{{ row.file }}</td>
          <td class="px-5 py-3 text-sm text-text-muted font-sans text-right">
            {{ row.timestamp }}
          </td>
        </tr>
      </template>
    </DataTable>
  </div>
</template>
