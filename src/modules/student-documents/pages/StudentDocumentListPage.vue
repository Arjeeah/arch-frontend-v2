<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { FileStack, Upload } from 'lucide-vue-next'
import AppSelect from '@/shared/components/AppSelect.vue'
import AppAsyncSelect from '@/shared/components/AppAsyncSelect.vue'
import SearchBar from '@/shared/components/SearchBar.vue'
import AppButton from '@/shared/components/AppButton.vue'
import AppPagination from '@/shared/components/AppPagination.vue'
import AppEmptyState from '@/shared/components/AppEmptyState.vue'
import AppErrorState from '@/shared/components/AppErrorState.vue'
import AppConfirmDialog from '@/shared/components/AppConfirmDialog.vue'
import { useServerTable } from '@/shared/composables/useServerTable'
import { useDebouncedRef } from '@/shared/composables/useDebouncedRef'
import { useToasts } from '@/shared/composables/useToasts'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import DocumentsTable from '../components/DocumentsTable.vue'
import { studentDocumentsApi } from '../api/studentDocumentsApi'
import { documentLookupsApi } from '../api/documentLookupsApi'
import { FILE_STATUSES, type LookupOption, type StudentDocument } from '../types'

const { t } = useI18n()
const toasts = useToasts()

const table = useServerTable((params) => studentDocumentsApi.list(params), {
  perPage: 15,
  filters: { sort: '-created_at' },
  errorFallback: t('studentDocuments.errors.listFailed'),
})

const fileNumberQuery = ref('')
const debouncedFileNumber = useDebouncedRef(fileNumberQuery)
const student = ref<LookupOption | null>(null)
const documentTypeFilter = ref('')
const fileStatusFilter = ref('')

watch(debouncedFileNumber, (value) => {
  table.setFilters({ 'filter[file_number]': value.trim() || undefined })
})
watch(student, (value) => {
  table.setFilters({ 'filter[student_id]': value?.value || undefined })
})
watch(documentTypeFilter, (value) => {
  table.setFilters({ 'filter[document_type_id]': value || undefined })
})
watch(fileStatusFilter, (value) => {
  table.setFilters({ 'filter[file_status]': value || undefined })
})

const documentTypes = ref<LookupOption[]>([])

async function loadDocumentTypes(): Promise<void> {
  try {
    documentTypes.value = await documentLookupsApi.documentTypes()
  } catch {
    // The filter is a convenience — the list works fine without it.
    documentTypes.value = []
  }
}
void loadDocumentTypes()

const fileStatusOptions = computed(() =>
  FILE_STATUSES.map((value) => ({ value, label: t(`studentDocuments.fileStatus.${value}`) })),
)

const hasFilters = computed(() =>
  Boolean(
    fileNumberQuery.value || student.value || documentTypeFilter.value || fileStatusFilter.value,
  ),
)

function clearFilters(): void {
  fileNumberQuery.value = ''
  student.value = null
  documentTypeFilter.value = ''
  fileStatusFilter.value = ''
}

// ── Delete ─────────────────────────────────────────────────────────────────
const deleteOpen = ref(false)
const deleting = ref<StudentDocument | null>(null)

function openDelete(document: StudentDocument): void {
  deleting.value = document
  deleteOpen.value = true
}

async function confirmDelete(): Promise<void> {
  const target = deleting.value
  if (!target) return
  try {
    await studentDocumentsApi.delete(target.id)
    toasts.success(t('studentDocuments.toasts.deleted', { fileNumber: target.fileNumber }))
    deleteOpen.value = false
    await table.refresh()
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('studentDocuments.errors.deleteFailed')))
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="font-display text-2xl font-semibold text-text-primary">
          {{ t('studentDocuments.title') }}
        </h1>
        <p class="mt-0.5 font-sans text-sm text-text-secondary">
          {{ t('studentDocuments.subtitle') }}
        </p>
      </div>
      <RouterLink to="/student-documents/upload">
        <AppButton variant="primary">
          <Upload class="h-4 w-4" />
          {{ t('studentDocuments.actions.upload') }}
        </AppButton>
      </RouterLink>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-3">
      <div class="min-w-[200px] flex-1">
        <SearchBar
          v-model="fileNumberQuery"
          :placeholder="t('studentDocuments.filters.fileNumber')"
        />
      </div>
      <div class="min-w-[220px] flex-1">
        <AppAsyncSelect
          v-model="student"
          :search-fn="documentLookupsApi.searchStudents"
          :placeholder="t('studentDocuments.filters.student')"
          :loading-text="t('studentDocuments.states.loading')"
          :empty-text="t('studentDocuments.filters.studentEmpty')"
          :error-text="t('studentDocuments.errors.lookupFailed')"
          :min-chars-text="t('studentDocuments.filters.studentMinChars')"
          :clear-label="t('studentDocuments.actions.clearStudent')"
        />
      </div>
      <AppSelect
        v-model="documentTypeFilter"
        :options="documentTypes"
        :placeholder="t('studentDocuments.filters.allTypes')"
      />
      <AppSelect
        v-model="fileStatusFilter"
        :options="fileStatusOptions"
        :placeholder="t('studentDocuments.filters.allStatuses')"
      />
      <AppButton v-if="hasFilters" variant="ghost" @click="clearFilters">
        {{ t('studentDocuments.actions.clearFilters') }}
      </AppButton>
    </div>

    <p class="font-sans text-xs text-text-secondary">
      {{ t('studentDocuments.resultCount', { count: table.total.value }) }}
    </p>

    <AppErrorState
      v-if="table.error.value"
      :title="t('studentDocuments.errors.listFailed')"
      :description="table.error.value"
      :retry-label="t('studentDocuments.actions.retry')"
      @retry="table.refresh()"
    />

    <AppEmptyState
      v-else-if="table.isEmpty.value"
      :icon="FileStack"
      :title="
        hasFilters ? t('studentDocuments.emptyFilteredTitle') : t('studentDocuments.emptyTitle')
      "
      :description="
        hasFilters
          ? t('studentDocuments.emptyFilteredDescription')
          : t('studentDocuments.emptyDescription')
      "
    >
      <template #action>
        <AppButton v-if="hasFilters" variant="ghost" @click="clearFilters">
          {{ t('studentDocuments.actions.clearFilters') }}
        </AppButton>
        <RouterLink v-else to="/student-documents/upload">
          <AppButton variant="primary" size="sm">
            <Upload class="h-4 w-4" />
            {{ t('studentDocuments.actions.upload') }}
          </AppButton>
        </RouterLink>
      </template>
    </AppEmptyState>

    <template v-else>
      <DocumentsTable
        :documents="table.rows.value"
        :loading="table.loading.value"
        @delete="openDelete"
      />

      <AppPagination
        v-if="table.totalPages.value > 1"
        v-model:currentPage="table.page.value"
        :total-pages="table.totalPages.value"
      />
    </template>
  </div>

  <AppConfirmDialog
    :open="deleteOpen"
    :title="t('studentDocuments.deleteDialog.title')"
    :confirm-label="t('studentDocuments.actions.delete')"
    confirm-class="bg-danger text-white hover:opacity-80"
    @close="deleteOpen = false"
    @confirm="confirmDelete"
  >
    <p class="font-sans text-sm text-text-secondary">
      {{ t('studentDocuments.deleteDialog.message', { fileNumber: deleting?.fileNumber ?? '' }) }}
    </p>
  </AppConfirmDialog>
</template>
