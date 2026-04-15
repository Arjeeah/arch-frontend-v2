<!-- src/modules/users/pages/UserDetailPage.vue -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Pencil } from 'lucide-vue-next'
import UserStatusBadge from '../components/UserStatusBadge.vue'
import UserPermissionsCard from '../components/UserPermissionsCard.vue'
import UserActivityCard from '../components/UserActivityCard.vue'
import CreateUserDialog from '../components/CreateUserDialog.vue'
import { mockUsers } from '../data/mockUsers'
import type { User } from '../types'

const route = useRoute()
const router = useRouter()

// Find user in mock data — keep a local ref so edits reflect immediately
const users = ref<User[]>([...mockUsers])
const user = computed(() => users.value.find(u => u.id === Number(route.params.id)) ?? null)

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

// Edit dialog
const editOpen = ref(false)

function handleSave(data: Partial<User>) {
  const idx = users.value.findIndex(u => u.id === user.value?.id)
  if (idx !== -1) users.value[idx] = { ...users.value[idx], ...data } as User
  editOpen.value = false
}
</script>

<template>
  <!-- Not found -->
  <div v-if="!user" class="flex flex-col items-center justify-center py-24 gap-4">
    <p class="text-text-secondary font-sans">User not found.</p>
    <button
      class="px-4 py-2 bg-primary text-white rounded-lg text-sm font-display"
      @click="router.push('/users')"
    >
      Back to Users
    </button>
  </div>

  <div v-else class="flex flex-col gap-6">
    <!-- Profile header -->
    <div class="bg-primary-dark rounded-[10px] px-8 py-6 flex items-center gap-5">
      <div class="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center shrink-0">
        <span class="text-xl font-display font-semibold text-white">{{ initials(user.name) }}</span>
      </div>
      <div>
        <div class="flex items-center gap-3 mb-1">
          <h1 class="text-xl font-display font-semibold text-white">{{ user.name }}</h1>
          <UserStatusBadge :status="user.status" />
        </div>
        <p class="text-sm text-white/70 font-sans">{{ user.email }}</p>
      </div>
    </div>

    <!-- 4 info blocks -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div class="bg-white rounded-[10px] border border-border p-5 shadow-sm">
        <p class="text-xs text-text-muted font-display mb-1">Role</p>
        <p class="text-base font-display font-semibold text-text-primary">{{ user.role }}</p>
      </div>
      <div class="bg-white rounded-[10px] border border-border p-5 shadow-sm">
        <p class="text-xs text-text-muted font-display mb-1">Faculties</p>
        <ul v-if="user.faculties.length" class="list-disc list-inside">
          <li v-for="f in user.faculties" :key="f" class="text-sm font-sans text-text-primary">{{ f }}</li>
        </ul>
        <p v-else class="text-sm font-sans text-text-muted">—</p>
      </div>
      <div class="bg-white rounded-[10px] border border-border p-5 shadow-sm">
        <p class="text-xs text-text-muted font-display mb-1">Last Login</p>
        <p class="text-sm font-display font-semibold text-text-primary">{{ user.lastLogin }}</p>
      </div>
      <div class="bg-white rounded-[10px] border border-border p-5 shadow-sm">
        <p class="text-xs text-text-muted font-display mb-1">Created At</p>
        <p class="text-sm font-display font-semibold text-text-primary">{{ user.createdAt }}</p>
      </div>
    </div>

    <!-- Permissions + Activity -->
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <UserPermissionsCard :permissions="user.permissions" />
      <UserActivityCard :activities="user.recentActivity" />
    </div>

    <!-- Bottom actions -->
    <div class="flex items-center justify-end gap-3 pt-2">
      <button
        class="flex items-center gap-2 px-5 py-2 rounded-lg border border-border text-sm font-display font-medium text-text-secondary hover:bg-surface transition-colors"
        @click="router.push('/users')"
      >
        <ArrowLeft class="w-4 h-4" />
        Back
      </button>
      <button
        class="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-white text-sm font-display font-medium hover:bg-primary-mid transition-colors"
        @click="editOpen = true"
      >
        <Pencil class="w-4 h-4" />
        Edit User
      </button>
    </div>
  </div>

  <!-- Edit dialog -->
  <CreateUserDialog
    :open="editOpen"
    :user="user"
    @close="editOpen = false"
    @save="handleSave"
  />
</template>
