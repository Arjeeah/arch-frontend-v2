<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Box, Plus } from 'lucide-vue-next'
import SearchBar from '@/shared/components/SearchBar.vue'
import AppSelect from '@/shared/components/AppSelect.vue'
import AppPagination from '@/shared/components/AppPagination.vue'
import AppConfirmDialog from '@/shared/components/AppConfirmDialog.vue'
import AppEmptyState from '@/shared/components/AppEmptyState.vue'
import AppErrorState from '@/shared/components/AppErrorState.vue'
import StatusBadge from '@/shared/components/StatusBadge.vue'
import { useServerTable } from '@/shared/composables/useServerTable'
import { useDebouncedRef } from '@/shared/composables/useDebouncedRef'
import { useToasts } from '@/shared/composables/useToasts'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import { roomsApi } from '../api/roomsApi'
import { cabinetsApi } from '../api/cabinetsApi'
import CabinetsTable from '../components/CabinetsTable.vue'
import CabinetFormDialog from '../components/CabinetFormDialog.vue'
import type { Cabinet, CabinetInput, LocationStatus, Room } from '../types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const toasts = useToasts()

const roomId = computed(() => String(route.params.roomId))

const room = ref<Room | null>(null)
const roomLoading = ref(true)
const roomError = ref<string | null>(null)

async function loadRoom() {
  roomLoading.value = true
  roomError.value = null
  try {
    room.value = await roomsApi.show(roomId.value)
  } catch (err) {
    roomError.value = getApiErrorMessage(err, t('locations.cabinets.roomLoadFailed'))
  } finally {
    roomLoading.value = false
  }
}

const search = ref('')
const debouncedSearch = useDebouncedRef(search, 300)
const statusFilter = ref<LocationStatus | ''>('')

const {
  rows: cabinets,
  loading,
  error,
  page,
  totalPages,
  isEmpty,
  setFilters,
  refresh,
} = useServerTable((params) => cabinetsApi.list({ ...params, roomId: roomId.value }), {
  perPage: 15,
  filters: { roomId: roomId.value },
})

watch(debouncedSearch, (name) => setFilters({ name }))
watch(statusFilter, (status) => setFilters({ status }))

/**
 * The route param drives both the room header and the cabinet list. Not
 * strictly needed given how this module links here (only from the rooms
 * list, one room at a time), but a direct URL edit or a future deep link
 * would otherwise show one room's header next to another room's cabinets.
 */
watch(roomId, (id) => {
  void loadRoom()
  setFilters({ roomId: id })
})

onMounted(loadRoom)

const statusOptions = [
  { value: '', label: t('locations.cabinets.filterAllStatuses') },
  { value: 'active', label: t('locations.common.statusActive') },
  { value: 'inactive', label: t('locations.common.statusInactive') },
]

const dialogOpen = ref(false)
const editingCabinet = ref<Cabinet | null>(null)
const saving = ref(false)

const deleteDialogOpen = ref(false)
const deletingCabinet = ref<Cabinet | null>(null)
const deleting = ref(false)

function openCreate() {
  editingCabinet.value = null
  dialogOpen.value = true
}

function openEdit(cabinet: Cabinet) {
  editingCabinet.value = cabinet
  dialogOpen.value = true
}

function openDelete(cabinet: Cabinet) {
  deletingCabinet.value = cabinet
  deleteDialogOpen.value = true
}

function viewDrawers(cabinet: Cabinet) {
  // `CabinetResource` never sends `room_id` back (see types.ts), so the
  // drawers page cannot derive "which room owns this cabinet" from the
  // cabinet alone. Carrying it as a query param lets that page build a
  // precise "back to this room's cabinets" link instead of falling back to
  // the top-level rooms list.
  void router.push({
    path: `/archive-room/cabinets/${cabinet.id}`,
    query: { roomId: roomId.value },
  })
}

function backToRooms() {
  void router.push('/archive-room')
}

async function handleSave(input: CabinetInput) {
  saving.value = true
  try {
    if (editingCabinet.value) {
      await cabinetsApi.update(editingCabinet.value.id, input)
      toasts.success(t('locations.cabinets.toasts.updated'))
    } else {
      await cabinetsApi.create(roomId.value, input)
      toasts.success(t('locations.cabinets.toasts.created'))
    }
    dialogOpen.value = false
    await refresh()
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('locations.cabinets.toasts.saveFailed')))
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  if (!deletingCabinet.value || deleting.value) return
  deleting.value = true
  try {
    await cabinetsApi.remove(deletingCabinet.value.id)
    toasts.success(t('locations.cabinets.toasts.deleted'))
    deleteDialogOpen.value = false
    await refresh()
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('locations.cabinets.toasts.deleteFailed')))
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <button
      type="button"
      class="flex w-fit items-center gap-1.5 text-sm font-sans font-medium text-text-secondary transition-colors hover:text-text-primary"
      @click="backToRooms"
    >
      <ArrowLeft class="h-4 w-4" />
      {{ t('locations.common.backToRooms') }}
    </button>

    <AppErrorState v-if="roomError" :description="roomError" @retry="loadRoom" />
    <template v-else>
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-center gap-3">
          <div
            class="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <Box class="h-6 w-6" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-2xl font-display font-semibold text-text-primary">
                {{ roomLoading ? t('locations.common.loading') : room?.name }}
              </h1>
              <StatusBadge v-if="room" :status="room.status">
                {{
                  t(`locations.common.status${room.status === 'active' ? 'Active' : 'Inactive'}`)
                }}
              </StatusBadge>
            </div>
            <p class="mt-0.5 text-sm font-sans text-text-secondary">
              {{ t('locations.cabinets.subtitle') }}
            </p>
          </div>
        </div>
        <button
          type="button"
          class="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-display font-medium text-white transition-colors hover:bg-primary-mid"
          @click="openCreate"
        >
          <Plus class="h-4 w-4" />
          {{ t('locations.cabinets.addCabinet') }}
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-[15px]">
        <div class="w-full min-w-[200px] sm:w-[320px]">
          <SearchBar v-model="search" :placeholder="t('locations.cabinets.searchPlaceholder')" />
        </div>
        <AppSelect v-model="statusFilter" :options="statusOptions" class="w-full sm:w-[170px]" />
      </div>

      <AppErrorState v-if="error" :description="error" @retry="refresh" />
      <AppEmptyState
        v-else-if="isEmpty"
        :title="t('locations.cabinets.emptyTitle')"
        :description="t('locations.cabinets.emptyDescription')"
        :icon="Box"
      >
        <template #action>
          <button
            type="button"
            class="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-display font-medium text-white transition-colors hover:bg-primary-mid"
            @click="openCreate"
          >
            <Plus class="h-4 w-4" />
            {{ t('locations.cabinets.addCabinet') }}
          </button>
        </template>
      </AppEmptyState>
      <template v-else>
        <CabinetsTable
          :cabinets="cabinets"
          :loading="loading"
          @view="viewDrawers"
          @edit="openEdit"
          @delete="openDelete"
        />
        <AppPagination
          v-if="totalPages > 1"
          v-model:current-page="page"
          :total-pages="totalPages"
        />
      </template>
    </template>
  </div>

  <CabinetFormDialog
    :open="dialogOpen"
    :cabinet="editingCabinet"
    :room-name="room?.name ?? ''"
    :saving="saving"
    @close="dialogOpen = false"
    @save="handleSave"
  />

  <AppConfirmDialog
    :open="deleteDialogOpen"
    :title="t('locations.cabinets.deleteTitle')"
    :confirm-label="t('locations.common.delete')"
    confirm-class="bg-danger text-white hover:opacity-80"
    @close="deleteDialogOpen = false"
    @confirm="confirmDelete"
  >
    <p class="text-sm font-sans text-text-secondary">
      {{ t('locations.cabinets.deleteMessage', { name: deletingCabinet?.name ?? '' }) }}
    </p>
  </AppConfirmDialog>
</template>
