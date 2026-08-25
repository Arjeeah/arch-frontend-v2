<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Search, BookOpen, AlertCircle, Clock, CheckCircle } from 'lucide-vue-next'
import AppStatCard from '@/shared/components/AppStatCard.vue'
import AppPagination from '@/shared/components/AppPagination.vue'
import AppConfirmDialog from '@/shared/components/AppConfirmDialog.vue'
import AppSelect from '@/shared/components/AppSelect.vue'
import { usePagination } from '@/composables/usePagination'
import { daysUntil } from '@/shared/utils/date'
import { useBorrowingStore } from '../stores/useBorrowingStore'
import BorrowingTable from '../components/BorrowingTable.vue'
import CreateBorrowingDialog from '../components/CreateBorrowingDialog.vue'
import { BORROWING_STATUSES } from '../types'
import type { Borrowing, BorrowingInput } from '../types'

const store = useBorrowingStore()

onMounted(() => {
  store.fetchAll()
})

/**
 * There is no borrowings stats endpoint, so the four cards are derived from
 * the loaded records.
 */
const stats = computed(() => {
  const items = store.items
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

// Filters
const search = ref('')
const statusFilter = ref('')

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return store.items.filter((item) => {
    const matchSearch =
      !q ||
      (item.document?.title ?? '').toLowerCase().includes(q) ||
      (item.borrower?.name ?? '').toLowerCase().includes(q) ||
      item.purpose.toLowerCase().includes(q)
    const matchStatus = !statusFilter.value || item.status === statusFilter.value
    return matchSearch && matchStatus
  })
})

const { currentPage, totalPages, paginated, resetPage } = usePagination(filtered, 10)
watch([search, statusFilter], resetPage)

const statusOptions = BORROWING_STATUSES.map((status) => ({
  value: status,
  label: status.charAt(0).toUpperCase() + status.slice(1),
}))

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

async function handleSave(data: BorrowingInput) {
  try {
    if (editingItem.value) {
      // The borrowed document is fixed once the request exists.
      await store.update(editingItem.value.id, { purpose: data.purpose, dueDate: data.dueDate })
    } else {
      await store.create(data)
    }
    dialogOpen.value = false
  } catch {
    // store exposes the message via store.error
  }
}

// Workflow transitions that need confirmation because they cannot be undone
type PendingKind = 'reject' | 'return' | 'delete'
const pendingAction = ref<{ kind: PendingKind; item: Borrowing } | null>(null)

const confirmDialog = computed(() => {
  const action = pendingAction.value
  if (!action) return null
  const label = action.item.document?.title ?? `request #${action.item.id}`
  const presets: Record<
    PendingKind,
    { title: string; confirmLabel: string; confirmClass: string; message: string }
  > = {
    reject: {
      title: 'Reject Request',
      confirmLabel: 'Reject',
      confirmClass: 'bg-danger text-white hover:opacity-80',
      message: `Reject the borrowing request for ${label}? This cannot be undone.`,
    },
    return: {
      title: 'Mark as Returned',
      confirmLabel: 'Mark Returned',
      confirmClass: 'bg-primary text-white hover:opacity-80',
      message: `Record ${label} as returned? This cannot be undone.`,
    },
    delete: {
      title: 'Delete Borrowing',
      confirmLabel: 'Delete',
      confirmClass: 'bg-danger text-white hover:opacity-80',
      message: `Delete the borrowing record for ${label}? This action cannot be undone.`,
    },
  }
  return presets[action.kind]
})

async function confirmPending() {
  const action = pendingAction.value
  if (!action) return
  try {
    if (action.kind === 'reject') await store.reject(action.item.id)
    else if (action.kind === 'return') await store.markReturned(action.item.id)
    else await store.remove(action.item.id)
    pendingAction.value = null
  } catch {
    // store exposes the message via store.error
  }
}

// Transitions that are safe to apply directly
async function handleApprove(item: Borrowing) {
  try {
    await store.approve(item.id)
  } catch {
    // store exposes the message via store.error
  }
}
async function handleMarkBorrowed(item: Borrowing) {
  try {
    await store.markBorrowed(item.id)
  } catch {
    // store exposes the message via store.error
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-display font-semibold text-text-primary">Borrowing</h1>
        <p class="text-sm text-text-secondary font-sans mt-0.5">Manage borrowing records</p>
      </div>
      <button
        class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-display font-medium hover:bg-primary-mid transition-colors"
        @click="openCreate"
      >
        Add Borrowing
      </button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <AppStatCard
        :icon="BookOpen"
        :value="stats.active"
        label="Active Borrowings"
        sub-label="Currently borrowed items"
      />
      <AppStatCard
        :icon="AlertCircle"
        :value="stats.overdue"
        label="Overdue Items"
        sub-label="Items past their due date"
      />
      <AppStatCard
        :icon="Clock"
        :value="stats.dueSoon"
        label="Due Soon"
        sub-label="Items due within the next 7 days"
      />
      <AppStatCard
        :icon="CheckCircle"
        :value="stats.returnedThisWeek"
        label="Returned This Week"
        sub-label="Items returned in the past week"
      />
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-[15px] flex-wrap">
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
      <AppSelect v-model="statusFilter" :options="statusOptions" placeholder="All Status" />
    </div>

    <!-- Load error -->
    <div
      v-if="store.error && !dialogOpen"
      class="p-3 bg-danger/10 border border-danger/20 rounded-lg"
    >
      <p class="text-sm font-sans text-danger">{{ store.error }}</p>
    </div>

    <!-- Table -->
    <BorrowingTable
      :items="paginated"
      :loading="store.loading"
      @edit="openEdit"
      @delete="pendingAction = { kind: 'delete', item: $event }"
      @approve="handleApprove"
      @reject="pendingAction = { kind: 'reject', item: $event }"
      @mark-borrowed="handleMarkBorrowed"
      @mark-returned="pendingAction = { kind: 'return', item: $event }"
    />

    <!-- Pagination -->
    <AppPagination
      v-if="!store.loading && totalPages > 1"
      v-model:currentPage="currentPage"
      :total-pages="totalPages"
    />
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
    v-if="confirmDialog"
    :open="!!pendingAction"
    :title="confirmDialog.title"
    :confirm-label="confirmDialog.confirmLabel"
    :confirm-class="confirmDialog.confirmClass"
    @close="pendingAction = null"
    @confirm="confirmPending"
  >
    <p class="text-sm text-text-secondary font-sans">{{ confirmDialog.message }}</p>
  </AppConfirmDialog>
</template>
