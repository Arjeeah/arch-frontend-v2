<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Plus } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import AppSearchInput from '@/shared/components/AppSearchInput.vue'
import AppSelect from '@/shared/components/AppSelect.vue'
import AppPagination from '@/shared/components/AppPagination.vue'
import AppConfirmDialog from '@/shared/components/AppConfirmDialog.vue'
import AppEmptyState from '@/shared/components/AppEmptyState.vue'
import AppErrorState from '@/shared/components/AppErrorState.vue'
import { readSessionRole } from '@/app/config/sessionRole'
import { useServerTable } from '@/shared/composables/useServerTable'
import { useDebouncedRef } from '@/shared/composables/useDebouncedRef'
import { useToasts } from '@/shared/composables/useToasts'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import ProgramsTable from '../components/ProgramsTable.vue'
import CreateProgramDialog from '../components/CreateProgramDialog.vue'
import { facultyLookupApi, programsApi } from '../api/programsApi'
import { useProgramsStore } from '../stores/useProgramsStore'
import type { Program, ProgramInput } from '../types'

const { t } = useI18n()
const store = useProgramsStore()
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
    programsApi.list(params).then((res) => ({
      data: res.data,
      meta: res.meta ?? {},
    })),
  { perPage: 10, errorFallback: t('programs.errorState.title') },
)

/**
 * Who may actually change the catalogue.
 *
 * The route admits `super_admin` and `archivist` (`ProgramPolicy::viewAny`
 * returns true for everyone, and the list endpoint answers 200 for both), but
 * create/update/delete/restore are `isSuperAdmin` only — verified against the
 * running API, where a non-super-admin token posting a program gets
 * `403 { message: 'This action is unauthorized.' }`. Rendering the buttons for
 * an archivist promises an action the API will refuse, so they are hidden
 * instead, the same way the sidebar hides a route the guard would bounce.
 */
const canWrite = computed(() => readSessionRole() === 'super_admin')

/** Arabic and Arabic Supplement blocks — enough to tell the two name columns apart. */
const ARABIC_SCRIPT = /[\u0600-\u06FF\u0750-\u077F]/

/**
 * `name_ar` and `name_en` are separate allowed filters and Spatie ANDs them,
 * so one box cannot match "either language" in a single request. Rather than
 * pick one column and leave the other silently unsearchable on a bilingual
 * list, route the query to the column it could actually match — Arabic script
 * to `name_ar`, anything else to `name_en` — and clear the other half so a
 * query typed in one language never keeps ANDing a stale filter from before.
 */
const search = ref('')
const debouncedSearch = useDebouncedRef(search, 300)
watch(debouncedSearch, (value) => {
  const query = value.trim()
  const isArabic = ARABIC_SCRIPT.test(query)
  setFilters({
    name_ar: query && isArabic ? query : undefined,
    name_en: query && !isArabic ? query : undefined,
  })
})

const statusFilter = ref('')
const facultyFilter = ref('')
watch([statusFilter, facultyFilter], ([status, facultyId]) =>
  setFilters({
    status: status || undefined,
    faculty_id: facultyId ? Number(facultyId) : undefined,
  }),
)

// `computed`, not a plain array: `t()` read once at setup freezes the labels
// in whichever locale happened to be active, and the header's language switch
// does not remount this page.
const statusOptions = computed(() => [
  { value: 'active', label: t('programs.status.active') },
  { value: 'inactive', label: t('programs.status.inactive') },
])

/**
 * "No programs yet" is the wrong thing to say when a search or filter is what
 * emptied the list — it reads as "this screen is broken" to anyone who just
 * typed a query.
 */
const hasActiveFilters = computed(
  () => Boolean(search.value) || Boolean(statusFilter.value) || Boolean(facultyFilter.value),
)

const facultyOptions = ref<{ value: string; label: string }[]>([])
onMounted(async () => {
  try {
    facultyOptions.value = await facultyLookupApi.listOptions()
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('programs.toasts.facultiesLoadFailed')))
  }
})

const dialogOpen = ref(false)
const editingItem = ref<Program | null>(null)

function openCreate() {
  editingItem.value = null
  dialogOpen.value = true
}
function openEdit(item: Program) {
  editingItem.value = item
  dialogOpen.value = true
}

async function handleSave(data: ProgramInput) {
  try {
    if (editingItem.value) {
      await store.update(editingItem.value.id, data)
      toasts.success(t('programs.toasts.updated'))
    } else {
      await store.create(data)
      toasts.success(t('programs.toasts.created'))
    }
    dialogOpen.value = false
    await refresh()
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('programs.toasts.saveFailed')))
  }
}

const deleteDialogOpen = ref(false)
const deletingItem = ref<Program | null>(null)

function openDelete(item: Program) {
  deletingItem.value = item
  deleteDialogOpen.value = true
}

async function confirmDelete() {
  if (!deletingItem.value) return
  try {
    await store.remove(deletingItem.value.id)
    toasts.success(t('programs.toasts.deleted'))
    deleteDialogOpen.value = false
    // Deleting the last row of the last page leaves `page` past `last_page`;
    // `useServerTable.refresh()` clamps and refetches. See the note there.
    await refresh()
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('programs.toasts.deleteFailed')))
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-display font-semibold text-text-primary">
          {{ t('programs.title') }}
        </h1>
        <p class="text-sm text-text-secondary font-sans mt-0.5">{{ t('programs.subtitle') }}</p>
      </div>
      <button
        v-if="canWrite"
        class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-display font-medium hover:bg-primary-mid transition-colors"
        @click="openCreate"
      >
        <Plus class="w-4 h-4" />
        {{ t('programs.addNew') }}
      </button>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-[15px] flex-wrap">
      <AppSearchInput v-model="search" :placeholder="t('programs.searchPlaceholder')" />
      <AppSelect
        v-model="facultyFilter"
        :options="facultyOptions"
        :placeholder="t('programs.filters.allFaculties')"
      />
      <AppSelect
        v-model="statusFilter"
        :options="statusOptions"
        :placeholder="t('programs.filters.allStatuses')"
      />
    </div>

    <!-- Error state -->
    <AppErrorState
      v-if="tableError"
      :title="t('programs.errorState.title')"
      :description="tableError"
      :retry-label="t('programs.errorState.retry')"
      @retry="refresh"
    />

    <!-- Empty state -->
    <AppEmptyState
      v-else-if="isEmpty"
      :title="hasActiveFilters ? t('programs.empty.filteredTitle') : t('programs.empty.title')"
      :description="
        hasActiveFilters ? t('programs.empty.filteredDescription') : t('programs.empty.description')
      "
    />

    <!-- Table -->
    <template v-else>
      <ProgramsTable
        :items="rows"
        :loading="tableLoading"
        :can-write="canWrite"
        @edit="openEdit"
        @delete="openDelete"
      />

      <AppPagination v-if="totalPages > 1" v-model:current-page="page" :total-pages="totalPages" />
    </template>
  </div>

  <!-- Create / Edit dialog -->
  <CreateProgramDialog
    :open="dialogOpen"
    :item="editingItem"
    @close="dialogOpen = false"
    @save="handleSave"
  />

  <!-- Delete confirm dialog -->
  <AppConfirmDialog
    :open="deleteDialogOpen"
    :title="t('programs.deleteDialog.title')"
    :confirm-label="t('programs.deleteDialog.confirm')"
    confirm-class="bg-danger text-white hover:opacity-80"
    @close="deleteDialogOpen = false"
    @confirm="confirmDelete"
  >
    <p class="text-sm text-text-secondary font-sans">
      {{ t('programs.deleteDialog.message', { name: deletingItem?.nameEn }) }}
    </p>
  </AppConfirmDialog>
</template>
