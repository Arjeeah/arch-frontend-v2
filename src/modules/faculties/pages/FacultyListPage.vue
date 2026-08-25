<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Search } from 'lucide-vue-next'
import { useFacultiesStore } from '../stores/useFacultiesStore'
import FacultiesTable from '../components/FacultiesTable.vue'
import AppPagination from '@/shared/components/AppPagination.vue'
import AppConfirmDialog from '@/shared/components/AppConfirmDialog.vue'
import CreateFacultyDialog from '../components/CreateFacultyDialog.vue'
import AppSelect from '@/shared/components/AppSelect.vue'
import { usePagination } from '@/composables/usePagination'
import type { Faculty, FacultyInput } from '../types'

const store = useFacultiesStore()

onMounted(() => {
  store.fetchAll()
})

const search = ref('')
const statusFilter = ref('')

const dialogOpen = ref(false)
const editingItem = ref<Faculty | null>(null)
const deleteDialogOpen = ref(false)
const deletingItem = ref<Faculty | null>(null)

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return store.items.filter((item) => {
    const matchSearch =
      !q ||
      item.code.toLowerCase().includes(q) ||
      item.nameAR.toLowerCase().includes(q) ||
      item.nameEN.toLowerCase().includes(q)
    const matchStatus = !statusFilter.value || item.status === statusFilter.value
    return matchSearch && matchStatus
  })
})

const { currentPage, totalPages, paginated, resetPage } = usePagination(filtered, 10)
watch([search, statusFilter], resetPage)

const statusOptions = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
]

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
    } else {
      await store.create(data)
    }
    dialogOpen.value = false
  } catch {
    // store exposes the message via store.error
  }
}

async function confirmDelete() {
  if (!deletingItem.value) return
  try {
    await store.remove(deletingItem.value.id)
    deleteDialogOpen.value = false
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
        <h1 class="text-2xl font-display font-semibold text-text-primary">Faculties</h1>
        <p class="text-sm text-text-secondary font-sans mt-0.5">
          Manage faculties and their programs
        </p>
      </div>
      <button
        class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-display font-medium hover:bg-primary-mid transition-colors"
        @click="openCreate"
      >
        Add Faculty
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

    <!-- Load error -->
    <div
      v-if="store.error && !dialogOpen"
      class="p-3 bg-danger/10 border border-danger/20 rounded-lg"
    >
      <p class="text-sm font-sans text-danger">{{ store.error }}</p>
    </div>

    <!-- Table -->
    <FacultiesTable
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
    title="Delete Faculties"
    confirm-label="Delete"
    confirm-class="bg-danger text-white hover:opacity-80"
    @close="deleteDialogOpen = false"
    @confirm="confirmDelete"
  >
    <p class="text-sm text-text-secondary font-sans">
      Are you sure you want to delete
      <strong class="text-text-primary">{{ deletingItem?.nameEN }}</strong
      >? This action cannot be undone.
    </p>
  </AppConfirmDialog>
</template>
