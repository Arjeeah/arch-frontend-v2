<script setup lang="ts">
import { useRouter } from 'vue-router'
import { SquarePen, Ban } from 'lucide-vue-next'
import { formatDate } from '@/shared/utils/date'
import UserStatusBadge from './UserStatusBadge.vue'
import { roleLabel } from '../types'
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

function facultyNames(user: User) {
  return user.faculties.length ? user.faculties.map((f) => f.nameEN).join(', ') : '-'
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Header row -->
    <div
      class="flex flex-row items-center bg-surface-table border border-border rounded-[4px] h-[48px]"
    >
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-0 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Name</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-0 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Email</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-0 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Role</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-0 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Faculty</span>
      </div>
      <div class="flex justify-center items-center px-[13px] w-[150px] shrink-0 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Status</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-0 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Created At</span>
      </div>
      <div class="flex justify-center items-center px-[13px] w-[90px] shrink-0 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Actions</span>
      </div>
    </div>

    <!-- Loading skeleton -->
    <template v-if="loading">
      <div
        v-for="i in 6"
        :key="i"
        class="flex flex-row items-center bg-white border border-border rounded-[4px] h-[48px]"
      >
        <div class="flex justify-center items-center px-[13px] flex-1 min-w-0 h-full">
          <div class="h-4 bg-surface rounded animate-pulse w-[120px]" />
        </div>
        <div
          v-for="j in 3"
          :key="j"
          class="flex justify-center items-center px-[13px] flex-1 min-w-0 h-full"
        >
          <div class="h-4 bg-surface rounded animate-pulse w-[80px]" />
        </div>
        <div class="flex justify-center items-center px-[13px] w-[150px] shrink-0 h-full">
          <div class="h-4 bg-surface rounded animate-pulse w-[60px]" />
        </div>
        <div class="flex justify-center items-center px-[13px] flex-1 min-w-0 h-full">
          <div class="h-4 bg-surface rounded animate-pulse w-[80px]" />
        </div>
        <div class="flex justify-center items-center px-[13px] w-[90px] shrink-0 h-full">
          <div class="h-4 bg-surface rounded animate-pulse w-[60px]" />
        </div>
      </div>
    </template>

    <!-- Data rows -->
    <template v-else>
      <div
        v-for="user in users"
        :key="user.id"
        class="flex flex-row items-center bg-white border border-border rounded-[4px] h-[48px]"
      >
        <!-- Name -->
        <div class="flex items-center px-[13px] flex-1 min-w-0 overflow-hidden">
          <button
            class="text-[15px] font-sans text-black hover:text-primary transition-colors text-left truncate w-full"
            @click="router.push(`/users/${user.id}`)"
          >
            {{ user.name }}
          </button>
        </div>

        <!-- Email -->
        <div class="flex items-center justify-center px-[13px] flex-1 min-w-0 overflow-hidden">
          <span class="text-[15px] font-sans text-text-secondary truncate">{{ user.email }}</span>
        </div>

        <!-- Role -->
        <div class="flex items-center justify-center px-[13px] flex-1 min-w-0 overflow-hidden">
          <span class="text-[15px] font-sans text-text-secondary truncate">{{
            roleLabel(user.role)
          }}</span>
        </div>

        <!-- Faculty -->
        <div class="flex items-center justify-center px-[13px] flex-1 min-w-0 overflow-hidden">
          <span class="text-[15px] font-sans text-text-secondary truncate">{{
            facultyNames(user)
          }}</span>
        </div>

        <!-- Status -->
        <div class="flex justify-center items-center px-[13px] w-[150px] shrink-0">
          <UserStatusBadge :status="user.status" />
        </div>

        <!-- Created At -->
        <div class="flex items-center justify-center px-[13px] flex-1 min-w-0 overflow-hidden">
          <span class="text-[15px] font-sans text-text-secondary truncate">{{
            formatDate(user.createdAt)
          }}</span>
        </div>

        <!-- Actions -->
        <div class="flex justify-center items-center px-[13px] gap-[15px] w-[90px] shrink-0">
          <button
            class="text-[#4285F4] hover:opacity-70 transition-opacity"
            title="Edit user"
            @click="emit('edit', user)"
          >
            <SquarePen class="w-6 h-6" />
          </button>
          <button
            class="text-danger hover:opacity-70 transition-opacity"
            title="Delete user"
            @click="emit('delete', user)"
          >
            <Ban class="w-6 h-6" />
          </button>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-if="!users.length"
        class="flex justify-center items-center bg-white border border-border rounded-[4px] py-12"
      >
        <span class="text-sm text-text-muted font-sans">No users match the current filters.</span>
      </div>
    </template>
  </div>
</template>
