<!-- src/modules/users/pages/UserListPage.vue -->
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Search, UserPlus } from 'lucide-vue-next'
import UserTable from '../components/UserTable.vue'
import CreateUserDialog from '../components/CreateUserDialog.vue'
import AppSelect from '@/shared/components/AppSelect.vue'
import AppPagination from '@/shared/components/AppPagination.vue'
import AppConfirmDialog from '@/shared/components/AppConfirmDialog.vue'
import { usePagination } from '@/composables/usePagination'
import { ROLES } from '../types'
import type { User, UserInput } from '../types'
import { useUsersStore } from '../stores/useUsersStore'

const store = useUsersStore()

onMounted(() => {
  store.fetchUsers()
})

// Filters
const search = ref('')
const roleFilter = ref('')
const statusFilter = ref('')
const facultyFilter = ref('')

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return store.users.filter((u) => {
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    const matchRole = !roleFilter.value || u.role === roleFilter.value
    const matchStatus = !statusFilter.value || u.status === statusFilter.value
    const matchFaculty =
      !facultyFilter.value || u.faculties.some((f) => String(f.id) === facultyFilter.value)
    return matchSearch && matchRole && matchStatus && matchFaculty
  })
})

const { currentPage, totalPages, paginated, resetPage } = usePagination(filtered, 10)
watch([search, roleFilter, statusFilter, facultyFilter], resetPage)

// Create/Edit dialog
const dialogOpen = ref(false)
const editingUser = ref<User | null>(null)

function openCreate() {
  editingUser.value = null
  dialogOpen.value = true
}
function openEdit(user: User) {
  editingUser.value = user
  dialogOpen.value = true
}

async function handleSave(data: UserInput) {
  try {
    if (editingUser.value) {
      await store.updateUser(editingUser.value.id, data)
    } else {
      await store.createUser(data)
    }
    dialogOpen.value = false
  } catch {
    // store exposes the message via store.error
  }
}

// Delete dialog
const deleteDialogOpen = ref(false)
const deletingUser = ref<User | null>(null)

function openDelete(user: User) {
  deletingUser.value = user
  deleteDialogOpen.value = true
}
async function confirmDelete() {
  if (!deletingUser.value) return
  try {
    await store.deleteUser(deletingUser.value.id)
    deleteDialogOpen.value = false
  } catch {
    // store exposes the message via store.error
  }
}

// Select options
const roleOptions = ROLES.map((r) => ({ value: r.value, label: r.label }))
const statusOptions = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
]
// Derived from the loaded users — the users module cannot import the
// faculties module to fetch the full list.
const facultyOptions = computed(() => {
  const byId = new Map<number, string>()
  for (const user of store.users) {
    for (const faculty of user.faculties) byId.set(faculty.id, faculty.nameEN)
  }
  return [...byId].map(([id, label]) => ({ value: String(id), label }))
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-display font-semibold text-text-primary">User Management</h1>
        <p class="text-sm text-text-secondary font-sans mt-0.5">
          Manage system users and their roles
        </p>
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
      <AppSelect
        v-if="facultyOptions.length"
        v-model="facultyFilter"
        :options="facultyOptions"
        placeholder="All Faculties"
      />
    </div>

    <!-- Load error -->
    <div
      v-if="store.error && !dialogOpen"
      class="p-3 bg-danger/10 border border-danger/20 rounded-lg"
    >
      <p class="text-sm font-sans text-danger">{{ store.error }}</p>
    </div>

    <!-- Table -->
    <UserTable :users="paginated" :loading="store.loading" @edit="openEdit" @delete="openDelete" />

    <!-- Pagination -->
    <AppPagination
      v-if="!store.loading && totalPages > 1"
      v-model:currentPage="currentPage"
      :total-pages="totalPages"
    />
  </div>

  <!-- Create/Edit dialog -->
  <CreateUserDialog
    :open="dialogOpen"
    :user="editingUser"
    :loading="store.loading"
    :error="store.error"
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
      Are you sure you want to delete
      <strong class="text-text-primary">{{ deletingUser?.name }}</strong
      >? This action cannot be undone.
    </p>
  </AppConfirmDialog>
</template>
