<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search, BookOpen, AlertCircle, Clock, CheckCircle } from 'lucide-vue-next'
import AppStatCard from '@/shared/components/AppStatCard.vue'
import AppPagination from '@/shared/components/AppPagination.vue'
import AppConfirmDialog from '@/shared/components/AppConfirmDialog.vue'
import AppSelect from '@/shared/components/AppSelect.vue'
import AppEmptyState from '@/shared/components/AppEmptyState.vue'
import AppErrorState from '@/shared/components/AppErrorState.vue'
import { useServerTable } from '@/shared/composables/useServerTable'
import { useToasts } from '@/shared/composables/useToasts'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import { daysUntil } from '@/shared/utils/date'
import { useBorrowingStore } from '../stores/useBorrowingStore'
import { borrowingApi } from '../api/borrowingApi'
import BorrowingTable from '../components/BorrowingTable.vue'
import CreateBorrowingDialog from '../components/CreateBorrowingDialog.vue'
import { BORROWING_STATUSES } from '../types'
import type { Borrowing } from '../types'
import { currentActor } from '../utils/currentActor'

const { t } = useI18n()
const toasts = useToasts()
const store = useBorrowingStore()
const actor = currentActor()

const { rows, loading, error, page, totalPages, isEmpty, setFilters, refresh } =
  useServerTable<Borrowing>((params) => borrowingApi.list(params), { perPage: 10 })

/**
 * There is no borrowings stats endpoint, so these four cards are derived
 * from whatever page is currently loaded — an approximation, same as before
 * this module moved off client-side pagination. Fetching every page just to
 * total them would defeat the point of server pagination.
 */
const stats = computed(() => {
  const items = rows.value
  const isOverdue = (item: Borrowing) => {
    if (item.status === 'overdue') return true
    const days = daysUntil(item.dueDate)
    return item.status === 'borrowed' && days !== null && days < 0
  }
  const isDueSoon = (item: Borrowing) => {
    if (item.status !== 'borrowed' && item.status !== 'approved') return false
    const days = daysUntil(item.dueDate)
    return days !== null && days >= 0 && days <= 7
  }
  const isReturnedThisWeek = (item: Borrowing) => {
    if (item.status !== 'returned') return false
    const days = daysUntil(item.returnedAt)
    return days !== null && days <= 0 && days >= -7
  }

  return {
    active: items.filter((i) => i.status === 'borrowed').length,
    overdue: items.filter(isOverdue).length,
    dueSoon: items.filter(isDueSoon).length,
    returnedThisWeek: items.filter(isReturnedThisWeek).length,
  }
})

// Status filter maps to the backend's `filter[status]`.
const statusFilter = ref('')
watch(statusFilter, () => {
  setFilters(statusFilter.value ? { filter: { status: statusFilter.value } } : { filter: {} })
})

const statusOptions = BORROWING_STATUSES.map((status) => ({
  value: status,
  label: t(`borrowing.status.${status}`),
}))

/**
 * Borrowings has no free-text filter on the backend (no `AllowedFilter::partial`
 * on `BorrowingController::index`), so this only ever narrows the page that's
 * already loaded — it cannot reach across pages the way the status filter does.
 */
const search = ref('')
const visibleRows = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return rows.value
  return rows.value.filter(
    (item) =>
      (item.document?.title ?? '').toLowerCase().includes(q) ||
      (item.borrower?.name ?? '').toLowerCase().includes(q) ||
      item.notes.toLowerCase().includes(q),
  )
})

// Create / edit dialog
const dialogOpen = ref(false)
const editingItem = ref<Borrowing | null>(null)

function openCreate() {
  editingItem.value = null
  dialogOpen.value = true
}
function openEdit(item: Borrowing) {
  editingItem.value = item
  dialogOpen.value = true
}

async function handleSave(data: { studentDocumentId?: string; notes: string }) {
  try {
    if (editingItem.value) {
      await store.update(editingItem.value.id, { notes: data.notes })
      toasts.success(t('borrowing.toast.updated'))
    } else {
      if (!data.studentDocumentId) return
      await store.create({ studentDocumentId: data.studentDocumentId, notes: data.notes })
      toasts.success(t('borrowing.toast.created'))
    }
    dialogOpen.value = false
    await refresh()
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('borrowing.toast.saveFailed')))
  }
}

// Workflow transitions that need confirmation because they cannot be undone
type PendingKind = 'reject' | 'return' | 'delete'
const pendingAction = ref<{ kind: PendingKind; item: Borrowing } | null>(null)
const rejectReason = ref('')

function openPending(kind: PendingKind, item: Borrowing) {
  pendingAction.value = { kind, item }
  rejectReason.value = ''
}

// Kept resolvable even with no action pending so the dialog can stay mounted
// and play its open/close transition.
const confirmDialog = computed(() => {
  const action = pendingAction.value
  const label = action ? (action.item.document?.title ?? `#${action.item.id}`) : ''
  const presets: Record<
    PendingKind,
    { title: string; confirmLabel: string; confirmClass: string; message: string }
  > = {
    reject: {
      title: t('borrowing.confirm.reject.title'),
      confirmLabel: t('borrowing.confirm.reject.confirm'),
      confirmClass: 'bg-danger text-white hover:opacity-80',
      message: t('borrowing.confirm.reject.message', { label }),
    },
    return: {
      title: t('borrowing.confirm.return.title'),
      confirmLabel: t('borrowing.confirm.return.confirm'),
      confirmClass: 'bg-primary text-white hover:opacity-80',
      message: t('borrowing.confirm.return.message', { label }),
    },
    delete: {
      title: t('borrowing.confirm.delete.title'),
      confirmLabel: t('borrowing.confirm.delete.confirm'),
      confirmClass: 'bg-danger text-white hover:opacity-80',
      message: t('borrowing.confirm.delete.message', { label }),
    },
  }
  return presets[action?.kind ?? 'delete']
})

async function confirmPending() {
  const action = pendingAction.value
  if (!action) return

  if (action.kind === 'reject' && !rejectReason.value.trim()) {
    toasts.error(t('borrowing.toast.rejectReasonRequired'))
    return
  }

  try {
    if (action.kind === 'reject') {
      await store.reject(action.item.id, rejectReason.value.trim())
      toasts.success(t('borrowing.toast.rejected'))
    } else if (action.kind === 'return') {
      await store.markReturned(action.item.id)
      toasts.success(t('borrowing.toast.returned'))
    } else {
      await store.remove(action.item.id)
      toasts.success(t('borrowing.toast.deleted'))
    }
    pendingAction.value = null
    await refresh()
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('borrowing.toast.actionFailed')))
  }
}

// Transitions that are safe to apply directly
async function handleApprove(item: Borrowing) {
  try {
    await store.approve(item.id)
    toasts.success(t('borrowing.toast.approved'))
    await refresh()
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('borrowing.toast.actionFailed')))
  }
}
async function handleMarkBorrowed(item: Borrowing) {
  try {
    await store.markBorrowed(item.id)
    toasts.success(t('borrowing.toast.markedBorrowed'))
    await refresh()
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('borrowing.toast.actionFailed')))
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-display font-semibold text-text-primary">
          {{ t('borrowing.title') }}
        </h1>
        <p class="text-sm text-text-secondary font-sans mt-0.5">{{ t('borrowing.subtitle') }}</p>
      </div>
      <button
        v-if="actor.canRequest"
        class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-display font-medium hover:bg-primary-mid transition-colors"
        @click="openCreate"
      >
        {{ t('borrowing.addBorrowing') }}
      </button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <AppStatCard
        :icon="BookOpen"
        :value="stats.active"
        :label="t('borrowing.stats.active.label')"
        :sub-label="t('borrowing.stats.active.subLabel')"
      />
      <AppStatCard
        :icon="AlertCircle"
        :value="stats.overdue"
        :label="t('borrowing.stats.overdue.label')"
        :sub-label="t('borrowing.stats.overdue.subLabel')"
      />
      <AppStatCard
        :icon="Clock"
        :value="stats.dueSoon"
        :label="t('borrowing.stats.dueSoon.label')"
        :sub-label="t('borrowing.stats.dueSoon.subLabel')"
      />
      <AppStatCard
        :icon="CheckCircle"
        :value="stats.returnedThisWeek"
        :label="t('borrowing.stats.returnedThisWeek.label')"
        :sub-label="t('borrowing.stats.returnedThisWeek.subLabel')"
      />
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-[15px] flex-wrap">
      <div class="relative flex-1 min-w-[200px]">
        <Search class="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          v-model="search"
          type="text"
          :placeholder="t('borrowing.searchPlaceholder')"
          class="w-full h-[42px] ps-9 pe-4 bg-white border border-border-dropdown rounded-lg text-xs font-display font-medium text-[#313144] placeholder:text-text-muted placeholder:font-display placeholder:font-light focus:outline-none focus:border-primary"
          style="border-width: 1.3px"
        />
      </div>
      <AppSelect
        v-model="statusFilter"
        :options="statusOptions"
        :placeholder="t('borrowing.allStatus')"
      />
    </div>

    <!-- Error -->
    <AppErrorState v-if="error" :description="error" @retry="refresh" />

    <template v-else>
      <!-- Table -->
      <BorrowingTable
        :items="visibleRows"
        :loading="loading"
        :can-manage-workflow="actor.canManageWorkflow"
        :can-delete-any="actor.canDeleteAny"
        :current-user-id="actor.id"
        @edit="openEdit"
        @delete="openPending('delete', $event)"
        @approve="handleApprove"
        @reject="openPending('reject', $event)"
        @mark-borrowed="handleMarkBorrowed"
        @mark-returned="openPending('return', $event)"
      />

      <AppEmptyState
        v-if="isEmpty"
        :title="t('borrowing.empty.title')"
        :description="t('borrowing.empty.description')"
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
  <CreateBorrowingDialog
    :open="dialogOpen"
    :item="editingItem"
    :loading="store.loading"
    :error="store.error"
    @close="dialogOpen = false"
    @save="handleSave"
  />

  <!-- Confirm dialog for irreversible actions -->
  <AppConfirmDialog
    :open="!!pendingAction"
    :title="confirmDialog.title"
    :confirm-label="confirmDialog.confirmLabel"
    :confirm-class="confirmDialog.confirmClass"
    @close="pendingAction = null"
    @confirm="confirmPending"
  >
    <p class="text-sm text-text-secondary font-sans">{{ confirmDialog.message }}</p>

    <div v-if="pendingAction?.kind === 'reject'" class="mt-3">
      <label class="block text-sm font-sans text-text-primary mb-1">{{
        t('borrowing.confirm.reject.reasonLabel')
      }}</label>
      <textarea
        v-model="rejectReason"
        rows="2"
        :placeholder="t('borrowing.confirm.reject.reasonPlaceholder')"
        class="w-full bg-surface-card border border-border-input rounded-[9px] px-4 py-2 font-sans text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      />
    </div>
  </AppConfirmDialog>
</template>
