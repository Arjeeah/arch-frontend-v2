<!-- src/modules/users/pages/UserListPage.vue -->
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { UserPlus } from 'lucide-vue-next'
import UserTable from '../components/UserTable.vue'
import CreateUserDialog from '../components/CreateUserDialog.vue'
import AppSearchInput from '@/shared/components/AppSearchInput.vue'
import AppSelect from '@/shared/components/AppSelect.vue'
import AppPagination from '@/shared/components/AppPagination.vue'
import AppConfirmDialog from '@/shared/components/AppConfirmDialog.vue'
import AppEmptyState from '@/shared/components/AppEmptyState.vue'
import AppErrorState from '@/shared/components/AppErrorState.vue'
import { useServerTable } from '@/shared/composables/useServerTable'
import { useDebouncedRef } from '@/shared/composables/useDebouncedRef'
import { useToasts } from '@/shared/composables/useToasts'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import { ROLES } from '../types'
import type { User, UserInput } from '../types'
import type { FacultyOption } from '../api/usersApi'
import { usersApi } from '../api/usersApi'
import { useUsersStore } from '../stores/useUsersStore'

const { t } = useI18n()
const toasts = useToasts()
const store = useUsersStore()

const {
  rows: users,
  loading,
  error,
  page,
  totalPages,
  isEmpty,
  setFilters,
  refresh,
} = useServerTable<User>((params) => usersApi.list(params), {
  perPage: 10,
  errorFallback: t('users.error.title'),
})

// Filters
const search = ref('')
const debouncedSearch = useDebouncedRef(search, 300)
const roleFilter = ref('')
const statusFilter = ref('')
const facultyFilter = ref('')

/**
 * A COMPLETE address — the only thing `filter[email]` will accept.
 *
 * `UserController::index` validates `filter.email` with Laravel's `email`
 * rule, so a half-typed address (`ali@`, `ali@limu`) 422s the whole list
 * request. Routing on a bare `@` would therefore break the list on nearly
 * every keystroke of an email search, so the email lane only opens once the
 * query parses as a whole address; everything else searches by name.
 */
const COMPLETE_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/**
 * `filter[name]` and `filter[email]` are separate allowlisted filters on the
 * backend (`UserController::index`) — there is no OR between them, so one
 * search box has to pick a lane.
 */
function buildFilters() {
  const filter: Record<string, string> = {}
  const q = debouncedSearch.value.trim()
  if (q) {
    if (COMPLETE_EMAIL.test(q)) filter.email = q
    else filter.name = q
  }
  if (roleFilter.value) filter.role = roleFilter.value
  if (statusFilter.value) filter.status = statusFilter.value.toLowerCase()
  if (facultyFilter.value) filter.faculty = facultyFilter.value
  return { filter }
}

watch([debouncedSearch, roleFilter, statusFilter, facultyFilter], () => {
  setFilters(buildFilters())
})

// Faculty filter options — same lookup the chip picker uses.
const facultyOptions = ref<FacultyOption[]>([])
onMounted(async () => {
  try {
    facultyOptions.value = await usersApi.facultyOptions()
  } catch {
    // The filter dropdown just stays hidden — not worth a toast for a filter.
  }
})

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
      toasts.success(t('users.toast.updated'))
    } else {
      await store.createUser(data)
      toasts.success(t('users.toast.created'))
    }
    dialogOpen.value = false
    await refresh()
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('users.toast.saveFailed')))
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
    toasts.success(t('users.toast.deleted'))
    deleteDialogOpen.value = false
    await refresh()
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('users.toast.deleteFailed')))
  }
}

// Select options
const roleOptions = computed(() =>
  ROLES.map((r) => ({ value: r.value, label: t(`common.roles.${r.value}`) })),
)
const statusOptions = computed(() => [
  { value: 'Active', label: t('users.status.active') },
  { value: 'Inactive', label: t('users.status.inactive') },
])
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-display font-semibold text-text-primary">
          {{ t('users.title') }}
        </h1>
        <p class="text-sm text-text-secondary font-sans mt-0.5">
          {{ t('users.subtitle') }}
        </p>
      </div>
      <button
        class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-display font-medium hover:bg-primary-mid transition-colors"
        @click="openCreate"
      >
        <UserPlus class="w-4 h-4" />
        {{ t('users.addUser') }}
      </button>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-[15px] flex-wrap">
      <!-- Search -->
      <AppSearchInput v-model="search" :placeholder="t('users.searchPlaceholder')" />

      <AppSelect v-model="roleFilter" :options="roleOptions" :placeholder="t('users.allRoles')" />
      <AppSelect
        v-model="statusFilter"
        :options="statusOptions"
        :placeholder="t('users.allStatus')"
      />
      <AppSelect
        v-if="facultyOptions.length"
        v-model="facultyFilter"
        :options="facultyOptions.map((f) => ({ value: String(f.value), label: f.label }))"
        :placeholder="t('users.allFaculties')"
      />
    </div>

    <!-- Error -->
    <AppErrorState
      v-if="error"
      :title="t('users.error.title')"
      :description="error"
      :retry-label="t('users.error.retry')"
      @retry="refresh"
    />

    <template v-else>
      <!-- Table -->
      <UserTable :users="users" :loading="loading" @edit="openEdit" @delete="openDelete" />

      <AppEmptyState
        v-if="isEmpty"
        :title="t('users.empty.title')"
        :description="t('users.empty.description')"
      />

      <!-- Pagination -->
      <AppPagination
        v-if="!loading && totalPages > 1"
        v-model:currentPage="page"
        :total-pages="totalPages"
      />
    </template>
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
    :title="t('users.deleteDialog.title')"
    :confirm-label="t('users.deleteDialog.confirm')"
    confirm-class="bg-danger text-white hover:opacity-80"
    @close="deleteDialogOpen = false"
    @confirm="confirmDelete"
  >
    <p class="text-sm text-text-secondary font-sans">
      {{ t('users.deleteDialog.message', { name: deletingUser?.name ?? '' }) }}
    </p>
  </AppConfirmDialog>
</template>
