<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Search } from 'lucide-vue-next'
import { useBorrowingStore } from '../stores/useBorrowingStore'
import BorrowingTable from '../components/BorrowingTable.vue'
import AppPagination from '@/shared/components/AppPagination.vue'
import AppConfirmDialog from '@/shared/components/AppConfirmDialog.vue'
import CreateBorrowingDialog from '../components/CreateBorrowingDialog.vue'
import AppSelect from '@/shared/components/AppSelect.vue'
import { usePagination } from '@/composables/usePagination'
import type { Borrowing } from '../types'

const store = useBorrowingStore()

const search = ref('')
const statusFilter = ref('')

const dialogOpen = ref(false)
const editingItem = ref<Borrowing | null>(null)
const deleteDialogOpen = ref(false)
const deletingItem = ref<Borrowing | null>(null)

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return store.items.filter((item) => {
    const matchSearch =
      !q ||
      item.fileNumber.toLowerCase().includes(q) ||
      item.borrowerName.toLowerCase().includes(q) ||
      item.faculty.toLowerCase().includes(q) ||
      item.purpose.toLowerCase().includes(q) ||
      item.borrowDate.toLowerCase().includes(q) ||
      item.dueDate.toLowerCase().includes(q) ||
      item.returnDate.toLowerCase().includes(q)
    const matchStatus = !statusFilter.value || item.status === statusFilter.value
    return matchSearch && matchStatus
  })
})

const { currentPage, totalPages, paginated, resetPage } = usePagination(filtered, 10)
watch([search, statusFilter], resetPage)

const statusOptions = [
  { value: 'borrowed', label: 'borrowed' },
  { value: 'returned', label: 'returned' },
  { value: 'overdue', label: 'overdue' },
]

function openCreate() {
  editingItem.value = null
  dialogOpen.value = true
}
function openEdit(item: Borrowing) {
  editingItem.value = item
  dialogOpen.value = true
}
function openDelete(item: Borrowing) {
  deletingItem.value = item
  deleteDialogOpen.value = true
}

function handleSave(data: Partial<Borrowing>) {
  if (editingItem.value) {
    const idx = store.items.findIndex((i) => i.id === editingItem.value!.id)
    if (idx !== -1)
      store.items.splice(idx, 1, Object.assign({}, store.items[idx], data) as Borrowing)
  } else {
    const newId = Math.max(0, ...store.items.map((i) => i.id)) + 1
    store.items.unshift(
      Object.assign(
        {
          id: newId,
          fileNumber: '',
          borrowerName: '',
          faculty: '',
          purpose: '',
          borrowDate: '',
          dueDate: '',
          returnDate: '',
          status: '' as Borrowing['status'],
          createdAt: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
        },
        data,
      ) as Borrowing,
    )
  }
  dialogOpen.value = false
}

function confirmDelete() {
  if (deletingItem.value) {
    const idx = store.items.findIndex((i) => i.id === deletingItem.value!.id)
    if (idx !== -1) store.items.splice(idx, 1)
  }
  deleteDialogOpen.value = false
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

    <!-- Table -->
    <BorrowingTable
      :items="paginated"
      :loading="store.loading"
      @edit="openEdit"
      @delete="openDelete"
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
    @close="dialogOpen = false"
    @save="handleSave"
  />

  <!-- Delete confirm dialog -->
  <AppConfirmDialog
    :open="deleteDialogOpen"
    title="Delete Borrowing"
    confirm-label="Delete"
    confirm-class="bg-danger text-white hover:opacity-80"
    @close="deleteDialogOpen = false"
    @confirm="confirmDelete"
  >
    <p class="text-sm text-text-secondary font-sans">
      Are you sure you want to delete
      <strong class="text-text-primary">{{ deletingItem?.fileNumber }}</strong
      >? This action cannot be undone.
    </p>
  </AppConfirmDialog>
</template>
