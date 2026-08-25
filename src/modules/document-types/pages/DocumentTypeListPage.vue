<script setup lang="ts">
import { ref, watch } from 'vue'
import { Search, Plus } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import AppSelect from '@/shared/components/AppSelect.vue'
import AppPagination from '@/shared/components/AppPagination.vue'
import AppConfirmDialog from '@/shared/components/AppConfirmDialog.vue'
import AppEmptyState from '@/shared/components/AppEmptyState.vue'
import AppErrorState from '@/shared/components/AppErrorState.vue'
import { useServerTable } from '@/shared/composables/useServerTable'
import { useDebouncedRef } from '@/shared/composables/useDebouncedRef'
import { useToasts } from '@/shared/composables/useToasts'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import DocumentTypesTable from '../components/DocumentTypesTable.vue'
import CreateDocumentTypeDialog from '../components/CreateDocumentTypeDialog.vue'
import { documentTypesApi } from '../api/documentTypesApi'
import { useDocumentTypesStore } from '../stores/useDocumentTypesStore'
import type { DocumentType, DocumentTypeInput } from '../types'

const { t } = useI18n()
const store = useDocumentTypesStore()
const toasts = useToasts()

const {
  rows,
  loading: tableLoading,
  error: tableError,
  page,
  totalPages,
  isEmpty,
  setFilters,
  refresh,
} = useServerTable(
  (params) =>
    documentTypesApi.list(params).then((res) => ({
      data: res.data,
      meta: res.meta ?? {},
    })),
  { perPage: 10 },
)

const search = ref('')
const debouncedSearch = useDebouncedRef(search, 300)
watch(debouncedSearch, (value) => setFilters({ name: value || undefined }))

const statusFilter = ref('')
const requiredFilter = ref('')
watch([statusFilter, requiredFilter], ([status, required]) =>
  setFilters({
    status: status || undefined,
    is_required: required || undefined,
  }),
)

const statusOptions = [
  { value: 'active', label: t('documentTypes.status.active') },
  { value: 'inactive', label: t('documentTypes.status.inactive') },
]
const requiredOptions = [
  { value: '1', label: t('documentTypes.fields.required') },
  { value: '0', label: t('documentTypes.fields.optional') },
]

const dialogOpen = ref(false)
const editingItem = ref<DocumentType | null>(null)

function openCreate() {
  editingItem.value = null
  dialogOpen.value = true
}
function openEdit(item: DocumentType) {
  editingItem.value = item
  dialogOpen.value = true
}

async function handleSave(data: DocumentTypeInput) {
  try {
    if (editingItem.value) {
      await store.update(editingItem.value.id, data)
      toasts.success(t('documentTypes.toasts.updated'))
    } else {
      await store.create(data)
      toasts.success(t('documentTypes.toasts.created'))
    }
    dialogOpen.value = false
    await refresh()
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('documentTypes.toasts.saveFailed')))
  }
}

const deleteDialogOpen = ref(false)
const deletingItem = ref<DocumentType | null>(null)

function openDelete(item: DocumentType) {
  deletingItem.value = item
  deleteDialogOpen.value = true
}

async function confirmDelete() {
  if (!deletingItem.value) return
  try {
    await store.remove(deletingItem.value.id)
    toasts.success(t('documentTypes.toasts.deleted'))
    deleteDialogOpen.value = false
    await refresh()
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('documentTypes.toasts.deleteFailed')))
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-display font-semibold text-text-primary">
          {{ t('documentTypes.title') }}
        </h1>
        <p class="text-sm text-text-secondary font-sans mt-0.5">
          {{ t('documentTypes.subtitle') }}
        </p>
      </div>
      <button
        class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-display font-medium hover:bg-primary-mid transition-colors"
        @click="openCreate"
      >
        <Plus class="w-4 h-4" />
        {{ t('documentTypes.addNew') }}
      </button>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-[15px] flex-wrap">
      <div class="relative flex-1 min-w-[200px]">
        <Search class="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          v-model="search"
          type="text"
          :placeholder="t('documentTypes.searchPlaceholder')"
          class="w-full h-[42px] ps-9 pe-4 bg-white border border-border-dropdown rounded-lg text-xs font-display font-medium text-[#313144] placeholder:text-text-muted placeholder:font-display placeholder:font-light focus:outline-none focus:border-primary"
          style="border-width: 1.3px"
        />
      </div>
      <AppSelect
        v-model="statusFilter"
        :options="statusOptions"
        :placeholder="t('documentTypes.filters.allStatuses')"
      />
      <AppSelect
        v-model="requiredFilter"
        :options="requiredOptions"
        :placeholder="t('documentTypes.filters.allTypes')"
      />
    </div>

    <!-- Error state -->
    <AppErrorState v-if="tableError" :description="tableError" @retry="refresh" />

    <!-- Empty state -->
    <AppEmptyState
      v-else-if="isEmpty"
      :title="t('documentTypes.empty.title')"
      :description="t('documentTypes.empty.description')"
    />

    <!-- Table -->
    <template v-else>
      <DocumentTypesTable
        :items="rows"
        :loading="tableLoading"
        @edit="openEdit"
        @delete="openDelete"
      />

      <AppPagination v-if="totalPages > 1" v-model:current-page="page" :total-pages="totalPages" />
    </template>
  </div>

  <!-- Create / Edit dialog -->
  <CreateDocumentTypeDialog
    :open="dialogOpen"
    :item="editingItem"
    @close="dialogOpen = false"
    @save="handleSave"
  />

  <!-- Delete confirm dialog -->
  <AppConfirmDialog
    :open="deleteDialogOpen"
    :title="t('documentTypes.deleteDialog.title')"
    :confirm-label="t('documentTypes.deleteDialog.confirm')"
    confirm-class="bg-danger text-white hover:opacity-80"
    @close="deleteDialogOpen = false"
    @confirm="confirmDelete"
  >
    <p class="text-sm text-text-secondary font-sans">
      {{ t('documentTypes.deleteDialog.message', { name: deletingItem?.name }) }}
    </p>
  </AppConfirmDialog>
</template>
