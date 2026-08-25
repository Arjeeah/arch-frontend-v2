<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Archive, Plus } from 'lucide-vue-next'
import SearchBar from '@/shared/components/SearchBar.vue'
import AppSelect from '@/shared/components/AppSelect.vue'
import AppPagination from '@/shared/components/AppPagination.vue'
import AppConfirmDialog from '@/shared/components/AppConfirmDialog.vue'
import AppEmptyState from '@/shared/components/AppEmptyState.vue'
import AppErrorState from '@/shared/components/AppErrorState.vue'
import { useServerTable } from '@/shared/composables/useServerTable'
import { useDebouncedRef } from '@/shared/composables/useDebouncedRef'
import { useToasts } from '@/shared/composables/useToasts'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import { roomsApi } from '../api/roomsApi'
import RoomsTable from '../components/RoomsTable.vue'
import RoomFormDialog from '../components/RoomFormDialog.vue'
import type { LocationStatus, Room, RoomInput } from '../types'

const router = useRouter()
const { t } = useI18n()
const toasts = useToasts()

const search = ref('')
const debouncedSearch = useDebouncedRef(search, 300)
const statusFilter = ref<LocationStatus | ''>('')

const {
  rows: rooms,
  loading,
  error,
  page,
  totalPages,
  isEmpty,
  setFilters,
  refresh,
} = useServerTable((params) => roomsApi.list(params), { perPage: 15 })

watch(debouncedSearch, (name) => setFilters({ name }))
watch(statusFilter, (status) => setFilters({ status }))

const statusOptions = [
  { value: '', label: t('locations.rooms.filterAllStatuses') },
  { value: 'active', label: t('locations.common.statusActive') },
  { value: 'inactive', label: t('locations.common.statusInactive') },
]

const dialogOpen = ref(false)
const editingRoom = ref<Room | null>(null)
const saving = ref(false)

const deleteDialogOpen = ref(false)
const deletingRoom = ref<Room | null>(null)
const deleting = ref(false)

function openCreate() {
  editingRoom.value = null
  dialogOpen.value = true
}

function openEdit(room: Room) {
  editingRoom.value = room
  dialogOpen.value = true
}

function openDelete(room: Room) {
  deletingRoom.value = room
  deleteDialogOpen.value = true
}

function viewCabinets(room: Room) {
  void router.push(`/archive-room/rooms/${room.id}`)
}

async function handleSave(input: RoomInput) {
  saving.value = true
  try {
    if (editingRoom.value) {
      await roomsApi.update(editingRoom.value.id, input)
      toasts.success(t('locations.rooms.toasts.updated'))
    } else {
      await roomsApi.create(input)
      toasts.success(t('locations.rooms.toasts.created'))
    }
    dialogOpen.value = false
    await refresh()
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('locations.rooms.toasts.saveFailed')))
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  if (!deletingRoom.value || deleting.value) return
  deleting.value = true
  try {
    await roomsApi.remove(deletingRoom.value.id)
    toasts.success(t('locations.rooms.toasts.deleted'))
    deleteDialogOpen.value = false
    await refresh()
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('locations.rooms.toasts.deleteFailed')))
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-start justify-between gap-4">
      <div class="flex items-center gap-3">
        <div
          class="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary"
        >
          <Archive class="h-6 w-6" />
        </div>
        <div>
          <h1 class="text-2xl font-display font-semibold text-text-primary">
            {{ t('locations.rooms.title') }}
          </h1>
          <p class="mt-0.5 text-sm font-sans text-text-secondary">
            {{ t('locations.rooms.subtitle') }}
          </p>
        </div>
      </div>
      <button
        type="button"
        class="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-display font-medium text-white transition-colors hover:bg-primary-mid"
        @click="openCreate"
      >
        <Plus class="h-4 w-4" />
        {{ t('locations.rooms.addRoom') }}
      </button>
    </div>

    <div class="flex flex-wrap items-center gap-[15px]">
      <div class="w-full min-w-[200px] sm:w-[320px]">
        <SearchBar v-model="search" :placeholder="t('locations.rooms.searchPlaceholder')" />
      </div>
      <AppSelect v-model="statusFilter" :options="statusOptions" class="w-full sm:w-[170px]" />
    </div>

    <AppErrorState v-if="error" :description="error" @retry="refresh" />
    <AppEmptyState
      v-else-if="isEmpty"
      :title="t('locations.rooms.emptyTitle')"
      :description="t('locations.rooms.emptyDescription')"
      :icon="Archive"
    >
      <template #action>
        <button
          type="button"
          class="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-display font-medium text-white transition-colors hover:bg-primary-mid"
          @click="openCreate"
        >
          <Plus class="h-4 w-4" />
          {{ t('locations.rooms.addRoom') }}
        </button>
      </template>
    </AppEmptyState>
    <template v-else>
      <RoomsTable
        :rooms="rooms"
        :loading="loading"
        @view="viewCabinets"
        @edit="openEdit"
        @delete="openDelete"
      />
      <AppPagination v-if="totalPages > 1" v-model:current-page="page" :total-pages="totalPages" />
    </template>
  </div>

  <RoomFormDialog
    :open="dialogOpen"
    :room="editingRoom"
    :saving="saving"
    @close="dialogOpen = false"
    @save="handleSave"
  />

  <AppConfirmDialog
    :open="deleteDialogOpen"
    :title="t('locations.rooms.deleteTitle')"
    :confirm-label="t('locations.common.delete')"
    confirm-class="bg-danger text-white hover:opacity-80"
    @close="deleteDialogOpen = false"
    @confirm="confirmDelete"
  >
    <p class="text-sm font-sans text-text-secondary">
      {{ t('locations.rooms.deleteMessage', { name: deletingRoom?.name ?? '' }) }}
    </p>
  </AppConfirmDialog>
</template>
