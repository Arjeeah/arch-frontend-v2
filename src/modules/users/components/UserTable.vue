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
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Header row -->
    <div class="flex flex-row items-center bg-surface-table border border-border rounded-[4px] h-[48px]">
      <div class="flex justify-center items-center px-[13px] flex-1 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Name</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Email</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Role</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Faculty</span>
      </div>
      <div class="flex justify-center items-center px-[13px] w-[170px] shrink-0 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Status</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Last Login</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Created At</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 h-full">
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
        <div
          v-for="j in 8"
          :key="j"
          class="flex justify-center items-center px-[13px] flex-1 h-full"
        >
          <div
            class="h-4 bg-surface rounded animate-pulse"
            :style="{ width: j === 1 ? '120px' : j === 8 ? '60px' : '80px' }"
          />
        </div>
      </div>
    </template>

    <!-- Data rows -->
    <template v-else>
      <div
        v-for="user in users"
        :key="user.id"
        class="flex flex-row items-stretch bg-white border border-border rounded-[4px] min-h-[48px]"
      >
        <!-- Name (left-aligned, black) -->
        <div class="flex items-center px-[13px] flex-1">
          <button
            class="text-[15px] font-sans text-black hover:text-primary transition-colors text-left w-full"
            @click="router.push(`/users/${user.id}`)"
          >
            {{ user.name }}
          </button>
        </div>

        <!-- Email -->
        <div class="flex justify-center items-center px-[13px] py-[10px] flex-1">
          <span class="text-[15px] font-sans text-text-secondary text-center">{{ user.email }}</span>
        </div>

        <!-- Role -->
        <div class="flex justify-center items-center px-[13px] py-[10px] flex-1">
          <span class="text-[15px] font-sans text-text-secondary text-center">{{ user.role }}</span>
        </div>

        <!-- Faculty -->
        <div class="flex justify-center items-center px-[13px] py-[10px] flex-1">
          <span class="text-[15px] font-sans text-text-secondary text-center">
            {{ user.faculties.length ? user.faculties.join(', ') : '-' }}
          </span>
        </div>

        <!-- Status (fixed width, no flex-grow) -->
        <div class="flex justify-center items-center px-[13px] py-[10px] w-[170px] shrink-0">
          <UserStatusBadge :status="user.status" />
        </div>

        <!-- Last Login -->
        <div class="flex justify-center items-center px-[13px] py-[10px] flex-1">
          <span class="text-[15px] font-sans text-text-secondary text-center">{{ user.lastLogin }}</span>
        </div>

        <!-- Created At -->
        <div class="flex justify-center items-center px-[13px] py-[10px] flex-1">
          <span class="text-[15px] font-sans text-text-secondary text-center">{{ user.createdAt }}</span>
        </div>

        <!-- Actions -->
        <div class="flex justify-center items-center px-[13px] py-[10px] gap-[15px] flex-1">
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
