<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { SquarePen, Ban } from 'lucide-vue-next'
import { formatDate } from '@/shared/utils/date'
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
const { t } = useI18n()

function facultyNames(user: User) {
  return user.faculties.length ? user.faculties.map((f) => f.nameEN).join(', ') : '-'
}

function roleLabelT(role: User['role']): string {
  return t(`users.roles.${role}`)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Header row -->
    <div
      class="flex flex-row items-center bg-surface-table border border-border rounded-[4px] h-[48px]"
    >
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-0 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">{{
          t('users.table.name')
        }}</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-0 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">{{
          t('users.table.email')
        }}</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-0 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">{{
          t('users.table.role')
        }}</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-0 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">{{
          t('users.table.faculty')
        }}</span>
      </div>
      <div class="flex justify-center items-center px-[13px] w-[150px] shrink-0 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">{{
          t('users.table.status')
        }}</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-0 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">{{
          t('users.table.createdAt')
        }}</span>
      </div>
      <div class="flex justify-center items-center px-[13px] w-[90px] shrink-0 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">{{
          t('users.table.actions')
        }}</span>
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
            class="text-[15px] font-sans text-black hover:text-primary transition-colors text-start truncate w-full"
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
            roleLabelT(user.role)
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
            :title="t('users.table.editAction')"
            @click="emit('edit', user)"
          >
            <SquarePen class="w-6 h-6" />
          </button>
          <button
            class="text-danger hover:opacity-70 transition-opacity"
            :title="t('users.table.deleteAction')"
            @click="emit('delete', user)"
          >
            <Ban class="w-6 h-6" />
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
