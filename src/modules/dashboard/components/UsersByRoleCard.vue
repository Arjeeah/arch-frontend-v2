<!-- src/modules/dashboard/components/UsersByRoleCard.vue -->
<script setup lang="ts">
import { Users } from 'lucide-vue-next'
import { usersByRole } from '../data/mockDashboard'
</script>

<template>
  <div class="bg-white rounded-[10px] border border-border p-5 shadow-sm flex flex-col gap-4">
    <h3 class="text-sm font-display font-medium text-text-primary">Users by Role</h3>
    <table class="w-full flex-1">
      <thead>
        <tr class="border-b border-border">
          <th class="text-left text-xs text-text-muted font-display font-medium pb-2">Role</th>
          <th class="text-right text-xs text-text-muted font-display font-medium pb-2">Count</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in usersByRole" :key="row.role" class="border-b border-border last:border-0">
          <td class="py-2 text-sm text-text-primary font-sans">{{ row.role }}</td>
          <td class="py-2 text-sm text-text-primary font-sans text-right">{{ row.count }}</td>
        </tr>
      </tbody>
    </table>
    <button
      disabled
      class="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-primary/40 text-white text-sm font-display font-medium cursor-not-allowed"
    >
      <Users class="w-4 h-4" />
      View Users
    </button>
  </div>
</template>
