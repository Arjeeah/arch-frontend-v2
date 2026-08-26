<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, UsersRound } from 'lucide-vue-next'
import { authStorage } from '@/app/config/authStorage'
import AppSelect from '@/shared/components/AppSelect.vue'
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
import StudentsTable from '../components/StudentsTable.vue'
import StudentFormDialog from '../components/StudentFormDialog.vue'
import { studentsApi } from '../api/studentsApi'
import { studentLookupsApi } from '../api/studentLookupsApi'
import { useStudentsStore } from '../stores/useStudentsStore'
import { STUDENT_STATUSES, type LookupOption, type Student, type StudentInput } from '../types'

const { t, locale } = useI18n()
const toasts = useToasts()
const store = useStudentsStore()

/**
 * Faculty staff may read the register but not change it, so every mutating
 * control and the detail route are gated on the stored role. The router
 * enforces the same list server-side of the guard.
 */
const role = authStorage.getUser()?.role ?? null
const canManage = computed(() => role === 'super_admin' || role === 'archivist')

const table = useServerTable((params) => studentsApi.list(params), {
  perPage: 15,
  // `created_at` is one of the endpoint's allowed sorts; newest first puts
  // freshly scanned draft students where an archivist will see them.
  filters: { sort: '-created_at' },
  errorFallback: t('students.errors.listFailed'),
})

const nameQuery = ref('')
const numberQuery = ref('')
const facultyFilter = ref('')
const statusFilter = ref('')

const debouncedName = useDebouncedRef(nameQuery)
const debouncedNumber = useDebouncedRef(numberQuery)

watch(debouncedName, (value) => {
  table.setFilters({ 'filter[name]': value.trim() || undefined })
})
watch(debouncedNumber, (value) => {
  table.setFilters({ 'filter[student_number]': value.trim() || undefined })
})
watch(facultyFilter, (value) => {
  table.setFilters({ 'filter[faculty_id]': value || undefined })
})
watch(statusFilter, (value) => {
  table.setFilters({ 'filter[student_status]': value || undefined })
})

const faculties = ref<LookupOption[]>([])

async function loadFaculties(): Promise<void> {
  try {
    faculties.value = await studentLookupsApi.faculties(locale.value)
  } catch {
    // The filter is optional — without it the list simply stays unfiltered.
    faculties.value = []
  }
}
void loadFaculties()
watch(locale, () => void loadFaculties())

const statusOptions = computed(() =>
  STUDENT_STATUSES.map((value) => ({ value, label: t(`students.status.${value}`) })),
)

const hasFilters = computed(() =>
  Boolean(nameQuery.value || numberQuery.value || facultyFilter.value || statusFilter.value),
)

function clearFilters(): void {
  nameQuery.value = ''
  numberQuery.value = ''
  facultyFilter.value = ''
  statusFilter.value = ''
}

// ── Create / edit ──────────────────────────────────────────────────────────
const formOpen = ref(false)
const editing = ref<Student | null>(null)

function openCreate(): void {
  editing.value = null
  formOpen.value = true
}

function openEdit(student: Student): void {
  editing.value = student
  formOpen.value = true
}

async function handleSave(input: StudentInput): Promise<void> {
  const target = editing.value
  try {
    if (target) {
      await store.update(target.id, input)
      toasts.success(t('students.toasts.updated', { name: input.name }))
    } else {
      await store.create(input)
      toasts.success(t('students.toasts.created', { name: input.name }))
    }
    formOpen.value = false
    await table.refresh()
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('students.errors.saveFailed')))
  }
}

// ── Delete ─────────────────────────────────────────────────────────────────
const deleteOpen = ref(false)
const deleting = ref<Student | null>(null)

function openDelete(student: Student): void {
  deleting.value = student
  deleteOpen.value = true
}

async function confirmDelete(): Promise<void> {
  const target = deleting.value
  if (!target) return
  try {
    await store.remove(target.id)
    toasts.success(t('students.toasts.deleted', { name: target.name }))
    deleteOpen.value = false
    await table.refresh()
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('students.errors.deleteFailed')))
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="font-display text-2xl font-semibold text-text-primary">
          {{ t('students.title') }}
        </h1>
        <p class="mt-0.5 font-sans text-sm text-text-secondary">{{ t('students.subtitle') }}</p>
      </div>
      <AppButton v-if="canManage" variant="primary" @click="openCreate">
        <Plus class="h-4 w-4" />
        {{ t('students.actions.create') }}
      </AppButton>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-3">
      <div class="min-w-[200px] flex-1">
        <SearchBar v-model="nameQuery" :placeholder="t('students.filters.name')" />
      </div>
      <div class="min-w-[180px] flex-1">
        <SearchBar v-model="numberQuery" :placeholder="t('students.filters.studentNumber')" />
      </div>
      <AppSelect
        v-model="facultyFilter"
        :options="faculties"
        :placeholder="t('students.filters.allFaculties')"
      />
      <AppSelect
        v-model="statusFilter"
        :options="statusOptions"
        :placeholder="t('students.filters.allStatuses')"
      />
      <AppButton v-if="hasFilters" variant="ghost" @click="clearFilters">
        {{ t('students.actions.clearFilters') }}
      </AppButton>
    </div>

    <p class="font-sans text-xs text-text-secondary">
      {{ t('students.resultCount', { count: table.total.value }) }}
    </p>

    <AppErrorState
      v-if="table.error.value"
      :title="t('students.errors.listFailed')"
      :description="table.error.value"
      :retry-label="t('students.actions.retry')"
      @retry="table.refresh()"
    />

    <AppEmptyState
      v-else-if="table.isEmpty.value"
      :icon="UsersRound"
      :title="hasFilters ? t('students.emptyFilteredTitle') : t('students.emptyTitle')"
      :description="
        hasFilters ? t('students.emptyFilteredDescription') : t('students.emptyDescription')
      "
    >
      <template v-if="hasFilters" #action>
        <AppButton variant="ghost" @click="clearFilters">
          {{ t('students.actions.clearFilters') }}
        </AppButton>
      </template>
    </AppEmptyState>

    <template v-else>
      <StudentsTable
        :students="table.rows.value"
        :loading="table.loading.value"
        :can-manage="canManage"
        :can-open-detail="canManage"
        @edit="openEdit"
        @delete="openDelete"
      />

      <AppPagination
        v-if="table.totalPages.value > 1"
        v-model:currentPage="table.page.value"
        :total-pages="table.totalPages.value"
      />
    </template>
  </div>

  <StudentFormDialog
    :open="formOpen"
    :student="editing"
    :saving="store.saving"
    @close="formOpen = false"
    @save="handleSave"
  />

  <AppConfirmDialog
    :open="deleteOpen"
    :title="t('students.deleteDialog.title')"
    :confirm-label="t('students.actions.delete')"
    confirm-class="bg-danger text-white hover:opacity-80"
    @close="deleteOpen = false"
    @confirm="confirmDelete"
  >
    <p class="font-sans text-sm text-text-secondary">
      {{ t('students.deleteDialog.message', { name: deleting?.name ?? '' }) }}
    </p>
  </AppConfirmDialog>
</template>
