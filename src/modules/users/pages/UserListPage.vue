<!-- src/modules/users/pages/UserListPage.vue -->
<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { Search, UserPlus } from 'lucide-vue-next'
import UserTable from '../components/UserTable.vue'
import CreateUserDialog from '../components/CreateUserDialog.vue'
import AppDialog from '@/shared/components/AppDialog.vue'
import { mockUsers } from '../data/mockUsers'
import { ROLES, FACULTIES } from '../types'
import type { User } from '../types'

// Local reactive copy so add/edit/delete update the UI
const users = ref<User[]>([...mockUsers])

// Filters
const search = ref('')
const roleFilter = ref('')
const statusFilter = ref('')
const facultyFilter = ref('')
const currentPage = ref(1)
const PER_PAGE = 10

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return users.value.filter(u => {
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    const matchRole = !roleFilter.value || u.role === roleFilter.value
    const matchStatus = !statusFilter.value || u.status === statusFilter.value
    const matchFaculty = !facultyFilter.value || u.faculties.includes(facultyFilter.value)
    return matchSearch && matchRole && matchStatus && matchFaculty
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / PER_PAGE)))
const paginated = computed(() => {
  const start = (currentPage.value - 1) * PER_PAGE
  return filtered.value.slice(start, start + PER_PAGE)
})

function resetPage() { currentPage.value = 1 }
watch([search, roleFilter, statusFilter, facultyFilter], resetPage)

// Fake loading on mount
const loading = ref(true)
const loadingTimer = setTimeout(() => { loading.value = false }, 300)
onUnmounted(() => clearTimeout(loadingTimer))

// Create/Edit dialog
const dialogOpen = ref(false)
const editingUser = ref<User | null>(null)

function openCreate() { editingUser.value = null; dialogOpen.value = true }
function openEdit(user: User) { editingUser.value = user; dialogOpen.value = true }

function handleSave(data: Partial<User>) {
  if (editingUser.value) {
    const idx = users.value.findIndex(u => u.id === editingUser.value!.id)
    if (idx !== -1) users.value[idx] = Object.assign({}, users.value[idx], data) as User
  } else {
    const newId = Math.max(0, ...users.value.map(u => u.id)) + 1
    const newUser = Object.assign({ id: newId, name: '', email: '', role: '', faculties: [], status: 'Active' as const, permissions: [], recentActivity: [], lastLogin: '-', createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }, data) as User
    users.value.unshift(newUser)
  }
  dialogOpen.value = false
}

// Delete dialog
const deleteDialogOpen = ref(false)
const deletingUser = ref<User | null>(null)

function openDelete(user: User) { deletingUser.value = user; deleteDialogOpen.value = true }
function confirmDelete() {
  if (deletingUser.value) users.value = users.value.filter(u => u.id !== deletingUser.value!.id)
  deleteDialogOpen.value = false
}

// Pagination helpers
const visiblePages = computed(() => {
  const total = totalPages.value
  const cur = currentPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (cur <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (cur >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', cur - 1, cur, cur + 1, '...', total]
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-display font-semibold text-text-primary">User Management</h1>
        <p class="text-sm text-text-secondary font-sans mt-0.5">Manage system users and their roles</p>
      </div>
      <button
        class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-display font-medium hover:bg-primary-mid transition-colors"
        @click="openCreate"
      >
        <UserPlus class="w-4 h-4" />
        Add User
      </button>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-3 flex-wrap">
      <div class="relative flex-1 min-w-[200px]">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          v-model="search"
          type="text"
          placeholder="Search"
          class="w-full pl-9 pr-4 py-2 bg-white border border-border rounded-lg text-sm font-sans text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>
      <select
        v-model="roleFilter"
        class="px-4 py-2 bg-white border border-border rounded-lg text-sm font-sans text-text-primary focus:outline-none focus:border-primary"
      >
        <option value="">All Roles</option>
        <option v-for="r in ROLES" :key="r" :value="r">{{ r }}</option>
      </select>
      <select
        v-model="statusFilter"
        class="px-4 py-2 bg-white border border-border rounded-lg text-sm font-sans text-text-primary focus:outline-none focus:border-primary"
      >
        <option value="">All Status</option>
        <option value="Active">Active</option>
        <option value="Inactive">Inactive</option>
      </select>
      <select
        v-model="facultyFilter"
        class="px-4 py-2 bg-white border border-border rounded-lg text-sm font-sans text-text-primary focus:outline-none focus:border-primary"
      >
        <option value="">All Faculties</option>
        <option v-for="f in FACULTIES" :key="f" :value="f">{{ f }}</option>
      </select>
    </div>

    <!-- Table -->
    <UserTable
      :users="paginated"
      :loading="loading"
      @edit="openEdit"
      @delete="openDelete"
    />

    <!-- Pagination -->
    <div v-if="!loading && totalPages > 1" class="flex items-center justify-center gap-1">
      <button
        class="w-8 h-8 flex items-center justify-center rounded border border-border text-text-secondary hover:bg-surface disabled:opacity-40"
        :disabled="currentPage === 1"
        @click="currentPage--"
      >
        ‹
      </button>
      <template v-for="page in visiblePages" :key="String(page)">
        <span v-if="page === '...'" class="w-8 h-8 flex items-center justify-center text-text-muted text-sm">…</span>
        <button
          v-else
          class="w-8 h-8 flex items-center justify-center rounded text-sm font-display font-medium transition-colors"
          :class="page === currentPage ? 'bg-primary text-white' : 'border border-border text-text-secondary hover:bg-surface'"
          @click="currentPage = Number(page)"
        >
          {{ page }}
        </button>
      </template>
      <button
        class="w-8 h-8 flex items-center justify-center rounded border border-border text-text-secondary hover:bg-surface disabled:opacity-40"
        :disabled="currentPage === totalPages"
        @click="currentPage++"
      >
        ›
      </button>
    </div>
  </div>

  <!-- Create/Edit dialog -->
  <CreateUserDialog
    :open="dialogOpen"
    :user="editingUser"
    @close="dialogOpen = false"
    @save="handleSave"
  />

  <!-- Delete confirm dialog -->
  <AppDialog :open="deleteDialogOpen" title="Delete User" size="sm" @close="deleteDialogOpen = false">
    <p class="text-sm text-text-secondary font-sans">
      Are you sure you want to delete <strong class="text-text-primary">{{ deletingUser?.name }}</strong>? This action cannot be undone.
    </p>
    <template #footer>
      <button
        class="px-5 py-2 rounded-lg border border-border text-sm font-display font-medium text-text-secondary hover:bg-surface transition-colors"
        @click="deleteDialogOpen = false"
      >
        Cancel
      </button>
      <button
        class="px-5 py-2 rounded-lg bg-danger text-white text-sm font-display font-medium hover:opacity-80 transition-opacity"
        @click="confirmDelete"
      >
        Delete
      </button>
    </template>
  </AppDialog>
</template>
