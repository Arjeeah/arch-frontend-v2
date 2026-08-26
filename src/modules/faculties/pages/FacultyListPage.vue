<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFacultiesStore } from '../stores/useFacultiesStore'
import FacultiesTable from '../components/FacultiesTable.vue'
import AppPagination from '@/shared/components/AppPagination.vue'
import AppConfirmDialog from '@/shared/components/AppConfirmDialog.vue'
import CreateFacultyDialog from '../components/CreateFacultyDialog.vue'
import AppSearchInput from '@/shared/components/AppSearchInput.vue'
import AppSelect from '@/shared/components/AppSelect.vue'
import AppEmptyState from '@/shared/components/AppEmptyState.vue'
import AppErrorState from '@/shared/components/AppErrorState.vue'
import { readSessionRole } from '@/app/config/sessionRole'
import { useServerTable } from '@/shared/composables/useServerTable'
import { useDebouncedRef } from '@/shared/composables/useDebouncedRef'
import { useToasts } from '@/shared/composables/useToasts'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import { facultiesApi } from '../api/facultiesApi'
import type { Faculty, FacultyInput } from '../types'

const { t } = useI18n()
const toasts = useToasts()
const store = useFacultiesStore()

const {
  rows: items,
  loading,
  error,
  page,
  totalPages,
  isEmpty,
  setFilters,
  refresh,
} = useServerTable<Faculty>((params) => facultiesApi.list(params), {
  perPage: 10,
  errorFallback: t('faculties.error.title'),
})

/**
 * Who may actually change the catalogue.
 *
 * The route admits `super_admin` and `archivist` (`FacultyPolicy::viewAny`
 * returns true for everyone, and the list endpoint answers 200 for both), but
 * create/update/delete/restore are `isSuperAdmin` only — verified against the
 * running API, where an archivist token posting a faculty gets
 * `403 { message: 'This action is unauthorized.' }`. Rendering the buttons for
 * an archivist promises an action the API will refuse, so they are hidden
 * instead, the same way the sidebar hides a route the guard would bounce.
 */
const canWrite = computed(() => readSessionRole() === 'super_admin')

const search = ref('')
const debouncedSearch = useDebouncedRef(search, 300)
const statusFilter = ref('')

/**
 * `filter[name_ar]` and `filter[name_en]` are separate partial filters on
 * `Academic\FacultyController::index` — no `code` filter exists, and there is
 * no OR between the two name filters. Arabic text in the box searches the
 * Arabic name; anything else searches the English name.
 */
function buildFilters() {
  const filter: Record<string, string> = {}
  const q = debouncedSearch.value.trim()
  if (q) {
    if (/[؀-ۿ]/.test(q)) filter.name_ar = q
    else filter.name_en = q
  }
  if (statusFilter.value) filter.status = statusFilter.value.toLowerCase()
  return { filter }
}

watch([debouncedSearch, statusFilter], () => setFilters(buildFilters()))

const dialogOpen = ref(false)
const editingItem = ref<Faculty | null>(null)
const deleteDialogOpen = ref(false)
const deletingItem = ref<Faculty | null>(null)

// `computed`, not a plain array: `t()` evaluated once at setup would freeze
// these labels in whatever locale was active when the page mounted.
const statusOptions = computed(() => [
  { value: 'Active', label: t('faculties.status.active') },
  { value: 'Inactive', label: t('faculties.status.inactive') },
])

function openCreate() {
  editingItem.value = null
  dialogOpen.value = true
}
function openEdit(item: Faculty) {
  editingItem.value = item
  dialogOpen.value = true
}
function openDelete(item: Faculty) {
  deletingItem.value = item
  deleteDialogOpen.value = true
}

async function handleSave(data: FacultyInput) {
  try {
    if (editingItem.value) {
      await store.update(editingItem.value.id, data)
      toasts.success(t('faculties.toast.updated'))
    } else {
      await store.create(data)
      toasts.success(t('faculties.toast.created'))
    }
    dialogOpen.value = false
    await refresh()
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('faculties.toast.saveFailed')))
  }
}

async function confirmDelete() {
  if (!deletingItem.value) return
  try {
    await store.remove(deletingItem.value.id)
    toasts.success(t('faculties.toast.deleted'))
    deleteDialogOpen.value = false
    await refresh()
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('faculties.toast.deleteFailed')))
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-display font-semibold text-text-primary">
          {{ t('faculties.title') }}
        </h1>
        <p class="text-sm text-text-secondary font-sans mt-0.5">
          {{ t('faculties.subtitle') }}
        </p>
      </div>
      <button
        v-if="canWrite"
        class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-display font-medium hover:bg-primary-mid transition-colors"
        @click="openCreate"
      >
        {{ t('faculties.addFaculty') }}
      </button>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-[15px] flex-wrap">
      <AppSearchInput v-model="search" :placeholder="t('faculties.searchPlaceholder')" />
      <AppSelect
        v-model="statusFilter"
        :options="statusOptions"
        :placeholder="t('faculties.allStatus')"
      />
    </div>

    <!-- Error -->
    <AppErrorState
      v-if="error"
      :title="t('faculties.error.title')"
      :description="error"
      :retry-label="t('faculties.error.retry')"
      @retry="refresh"
    />

    <template v-else>
      <!-- Table -->
      <FacultiesTable
        :items="items"
        :loading="loading"
        :can-write="canWrite"
        @edit="openEdit"
        @delete="openDelete"
      />

      <AppEmptyState
        v-if="isEmpty"
        :title="t('faculties.empty.title')"
        :description="t('faculties.empty.description')"
      />

      <!-- Pagination -->
      <AppPagination
        v-if="!loading && totalPages > 1"
        v-model:currentPage="page"
        :total-pages="totalPages"
      />
    </template>
  </div>

  <!-- Create / Edit dialog -->
  <CreateFacultyDialog
    :open="dialogOpen"
    :item="editingItem"
    :loading="store.loading"
    :error="store.error"
    @close="dialogOpen = false"
    @save="handleSave"
  />

  <!-- Delete confirm dialog -->
  <AppConfirmDialog
    :open="deleteDialogOpen"
    :title="t('faculties.deleteDialog.title')"
    :confirm-label="t('faculties.deleteDialog.confirm')"
    confirm-class="bg-danger text-white hover:opacity-80"
    @close="deleteDialogOpen = false"
    @confirm="confirmDelete"
  >
    <p class="text-sm text-text-secondary font-sans">
      {{ t('faculties.deleteDialog.message', { name: deletingItem?.nameEN ?? '' }) }}
    </p>
  </AppConfirmDialog>
</template>
