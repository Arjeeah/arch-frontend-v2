<!-- src/modules/users/pages/UserListPage.vue -->
<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { Search, UserPlus } from 'lucide-vue-next'
import UserTable from '../components/UserTable.vue'
import CreateUserDialog from '../components/CreateUserDialog.vue'
import AppSelect from '@/shared/components/AppSelect.vue'
import AppPagination from '@/shared/components/AppPagination.vue'
import AppConfirmDialog from '@/shared/components/AppConfirmDialog.vue'
import { usePagination } from '@/composables/usePagination'
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

const { currentPage, totalPages, paginated, resetPage } = usePagination(filtered, 10)
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
    const newUser = Object.assign(
      { id: newId, name: '', email: '', role: '', faculties: [], status: 'Active' as const, permissions: [], recentActivity: [], lastLogin: '-', createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
      data,
    ) as User
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

// Select options
const roleOptions = ROLES.map(r => ({ value: r, label: r }))
const statusOptions = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
]
const facultyOptions = FACULTIES.map(f => ({ value: f, label: f }))
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
    <div class="flex items-center gap-[15px] flex-wrap">
      <!-- Search -->
      <div class="relative flex-1 min-w-[200px]">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          v-model="search"
          type="text"
          placeholder="Search"
          class="w-full h-[42px] pl-9 pr-4 bg-white border border-border-dropdown rounded-lg text-xs font-display font-medium text-[#313144] placeholder:text-text-muted placeholder:font-display placeholder:font-light focus:outline-none focus:border-primary"
          style="border-width: 1.3px"
        />
      </div>

      <AppSelect v-model="roleFilter" :options="roleOptions" placeholder="All Roles" />
      <AppSelect v-model="statusFilter" :options="statusOptions" placeholder="All Status" />
      <AppSelect v-model="facultyFilter" :options="facultyOptions" placeholder="All Faculties" />
    </div>

    <!-- Table -->
    <UserTable
      :users="paginated"
      :loading="loading"
      @edit="openEdit"
      @delete="openDelete"
    />

    <!-- Pagination -->
    <AppPagination
      v-if="!loading && totalPages > 1"
      v-model:currentPage="currentPage"
      :total-pages="totalPages"
    />
  </div>

  <!-- Create/Edit dialog -->
  <CreateUserDialog
    :open="dialogOpen"
    :user="editingUser"
    @close="dialogOpen = false"
    @save="handleSave"
  />

  <!-- Delete confirm dialog -->
  <AppConfirmDialog
    :open="deleteDialogOpen"
    title="Delete User"
    confirm-label="Delete"
    confirm-class="bg-danger text-white hover:opacity-80"
    @close="deleteDialogOpen = false"
    @confirm="confirmDelete"
  >
    <p class="text-sm text-text-secondary font-sans">
      Are you sure you want to delete <strong class="text-text-primary">{{ deletingUser?.name }}</strong>? This action cannot be undone.
    </p>
  </AppConfirmDialog>
</template>
