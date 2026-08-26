<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search } from 'lucide-vue-next'
import { useFacultiesStore } from '../stores/useFacultiesStore'
import FacultiesTable from '../components/FacultiesTable.vue'
import AppPagination from '@/shared/components/AppPagination.vue'
import AppConfirmDialog from '@/shared/components/AppConfirmDialog.vue'
import CreateFacultyDialog from '../components/CreateFacultyDialog.vue'
import AppSelect from '@/shared/components/AppSelect.vue'
import AppEmptyState from '@/shared/components/AppEmptyState.vue'
import AppErrorState from '@/shared/components/AppErrorState.vue'
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
} = useServerTable<Faculty>((params) => facultiesApi.list(params), { perPage: 10 })

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
        class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-display font-medium hover:bg-primary-mid transition-colors"
        @click="openCreate"
      >
        {{ t('faculties.addFaculty') }}
      </button>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-[15px] flex-wrap">
      <div class="relative flex-1 min-w-[200px]">
        <Search class="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          v-model="search"
          type="text"
          :placeholder="t('faculties.searchPlaceholder')"
          class="w-full h-[42px] ps-9 pe-4 bg-white border border-border-dropdown rounded-lg text-xs font-display font-medium text-[#313144] placeholder:text-text-muted placeholder:font-display placeholder:font-light focus:outline-none focus:border-primary"
          style="border-width: 1.3px"
        />
      </div>
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
      <FacultiesTable :items="items" :loading="loading" @edit="openEdit" @delete="openDelete" />

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
