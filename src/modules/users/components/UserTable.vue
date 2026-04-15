<script setup lang="ts">
import { useRouter } from 'vue-router'
import { SquarePen, Ban } from 'lucide-vue-next'
import UserStatusBadge from './UserStatusBadge.vue'
import type { User } from '../types'

defineProps<{
  users: User[]
  loading?: boolean
}>()

const emit = defineEmits<{
  edit: [user: User]
  delete: [user: User]
}>()

const router = useRouter()

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
</script>

<template>
  <div class="bg-white rounded-[10px] border border-border overflow-hidden shadow-sm">
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-surface-table border-b border-border">
          <tr>
            <th class="text-left px-5 py-3 text-xs font-display font-medium text-text-muted">Name</th>
            <th class="text-left px-5 py-3 text-xs font-display font-medium text-text-muted">Email</th>
            <th class="text-left px-5 py-3 text-xs font-display font-medium text-text-muted">Role</th>
            <th class="text-left px-5 py-3 text-xs font-display font-medium text-text-muted">Faculty</th>
            <th class="text-left px-5 py-3 text-xs font-display font-medium text-text-muted">Status</th>
            <th class="text-left px-5 py-3 text-xs font-display font-medium text-text-muted">Last Login</th>
            <th class="text-left px-5 py-3 text-xs font-display font-medium text-text-muted">Created At</th>
            <th class="text-left px-5 py-3 text-xs font-display font-medium text-text-muted">Actions</th>
          </tr>
        </thead>
        <tbody>
          <!-- Loading skeleton -->
          <template v-if="loading">
            <tr v-for="i in 6" :key="i" class="border-t border-border">
              <td v-for="j in 8" :key="j" class="px-5 py-4">
                <div class="h-4 bg-surface rounded animate-pulse" :style="{ width: j === 1 ? '120px' : j === 8 ? '60px' : '80px' }" />
              </td>
            </tr>
          </template>

          <!-- Data rows -->
          <template v-else>
            <tr
              v-for="user in users"
              :key="user.id"
              class="border-t border-border hover:bg-surface transition-colors"
            >
              <td class="px-5 py-4">
                <button
                  class="text-sm font-sans font-medium text-text-primary hover:text-primary transition-colors text-left"
                  @click="router.push(`/users/${user.id}`)"
                >
                  {{ user.name }}
                </button>
              </td>
              <td class="px-5 py-4 text-sm text-text-secondary font-sans">{{ user.email }}</td>
              <td class="px-5 py-4 text-sm text-text-primary font-sans">{{ user.role }}</td>
              <td class="px-5 py-4 text-sm text-text-secondary font-sans">
                {{ user.faculties.length ? user.faculties.join(', ') : '-' }}
              </td>
              <td class="px-5 py-4">
                <UserStatusBadge :status="user.status" />
              </td>
              <td class="px-5 py-4 text-sm text-text-muted font-sans">{{ user.lastLogin }}</td>
              <td class="px-5 py-4 text-sm text-text-muted font-sans">{{ user.createdAt }}</td>
              <td class="px-5 py-4">
                <div class="flex items-center gap-2">
                  <button
                    class="text-primary hover:text-primary-mid transition-colors"
                    title="Edit user"
                    @click="emit('edit', user)"
                  >
                    <SquarePen class="w-5 h-5" />
                  </button>
                  <button
                    class="text-danger hover:opacity-70 transition-opacity"
                    title="Delete user"
                    @click="emit('delete', user)"
                  >
                    <Ban class="w-5 h-5" />
                  </button>
                </div>
              </td>
            </tr>

            <!-- Empty state -->
            <tr v-if="!users.length">
              <td colspan="8" class="px-5 py-12 text-center text-sm text-text-muted font-sans">
                No users match the current filters.
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
