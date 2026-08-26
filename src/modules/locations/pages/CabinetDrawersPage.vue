<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Inbox, Plus } from 'lucide-vue-next'
import AppSelect from '@/shared/components/AppSelect.vue'
import AppPagination from '@/shared/components/AppPagination.vue'
import AppConfirmDialog from '@/shared/components/AppConfirmDialog.vue'
import AppEmptyState from '@/shared/components/AppEmptyState.vue'
import AppErrorState from '@/shared/components/AppErrorState.vue'
import StatusBadge from '@/shared/components/StatusBadge.vue'
import { useServerTable } from '@/shared/composables/useServerTable'
import { useToasts } from '@/shared/composables/useToasts'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import { cabinetsApi } from '../api/cabinetsApi'
import { drawersApi } from '../api/drawersApi'
import DrawersTable from '../components/DrawersTable.vue'
import DrawerFormDialog from '../components/DrawerFormDialog.vue'
import type { Cabinet, Drawer, DrawerInput, LocationStatus } from '../types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const toasts = useToasts()

const cabinetId = computed(() => String(route.params.cabinetId))
/** Set when this page was reached by drilling down from a room's cabinet list — see RoomCabinetsPage's `viewDrawers`. */
const roomIdHint = computed(() =>
  typeof route.query.roomId === 'string' ? route.query.roomId : null,
)

const cabinet = ref<Cabinet | null>(null)
const cabinetLoading = ref(true)
const cabinetError = ref<string | null>(null)

async function loadCabinet() {
  cabinetLoading.value = true
  cabinetError.value = null
  try {
    cabinet.value = await cabinetsApi.show(cabinetId.value)
  } catch (err) {
    cabinetError.value = getApiErrorMessage(err, t('locations.drawers.cabinetLoadFailed'))
  } finally {
    cabinetLoading.value = false
  }
}

const statusFilter = ref<LocationStatus | ''>('')

const {
  rows: drawers,
  loading,
  error,
  page,
  totalPages,
  isEmpty,
  setFilters,
  refresh,
} = useServerTable((params) => drawersApi.list({ ...params, cabinetId: cabinetId.value }), {
  perPage: 15,
  filters: { cabinetId: cabinetId.value },
})

watch(statusFilter, (status) => setFilters({ status }))

/** Same rationale as `RoomCabinetsPage` — keeps a direct URL edit consistent. */
watch(cabinetId, (id) => {
  void loadCabinet()
  setFilters({ cabinetId: id })
})

onMounted(loadCabinet)

// See RoomsPage: `computed` so the labels follow a locale switch.
const statusOptions = computed(() => [
  { value: '', label: t('locations.drawers.filterAllStatuses') },
  { value: 'active', label: t('locations.common.statusActive') },
  { value: 'inactive', label: t('locations.common.statusInactive') },
])

/** See RoomsPage: "nothing matched" is a different empty state from "nothing here yet". */
const hasActiveFilters = computed(() => Boolean(statusFilter.value))

const dialogOpen = ref(false)
const editingDrawer = ref<Drawer | null>(null)
const saving = ref(false)

const deleteDialogOpen = ref(false)
const deletingDrawer = ref<Drawer | null>(null)
const deleting = ref(false)

function openCreate() {
  editingDrawer.value = null
  dialogOpen.value = true
}

function openEdit(drawer: Drawer) {
  editingDrawer.value = drawer
  dialogOpen.value = true
}

function openDelete(drawer: Drawer) {
  deletingDrawer.value = drawer
  deleteDialogOpen.value = true
}

function goBack() {
  void router.push(roomIdHint.value ? `/archive-room/rooms/${roomIdHint.value}` : '/archive-room')
}

async function handleSave(input: DrawerInput) {
  saving.value = true
  try {
    if (editingDrawer.value) {
      await drawersApi.update(editingDrawer.value.id, input)
      toasts.success(t('locations.drawers.toasts.updated'))
    } else {
      await drawersApi.create(cabinetId.value, input)
      toasts.success(t('locations.drawers.toasts.created'))
    }
    dialogOpen.value = false
    await refresh()
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('locations.drawers.toasts.saveFailed')))
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  if (!deletingDrawer.value || deleting.value) return
  deleting.value = true
  try {
    await drawersApi.remove(deletingDrawer.value.id)
    toasts.success(t('locations.drawers.toasts.deleted'))
    deleteDialogOpen.value = false
    // See RoomsPage.confirmDelete: deleting the last row on a page past the
    // first would otherwise strand the user on an out-of-range page.
    if (drawers.value.length === 1 && page.value > 1) page.value -= 1
    else await refresh()
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('locations.drawers.toasts.deleteFailed')))
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
      @click="goBack"
    >
      <!-- "Back" runs the other way under dir="rtl", so mirror the arrow. -->
      <ArrowLeft class="h-4 w-4 rtl:rotate-180" />
      {{ roomIdHint ? t('locations.common.backToCabinets') : t('locations.common.backToRooms') }}
    </button>

    <AppErrorState
      v-if="cabinetError"
      :title="t('locations.common.errorTitle')"
      :description="cabinetError"
      :retry-label="t('locations.common.retry')"
      @retry="loadCabinet"
    />
    <template v-else>
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-center gap-3">
          <div
            class="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <Inbox class="h-6 w-6" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-2xl font-display font-semibold text-text-primary">
                {{ cabinetLoading ? t('locations.common.loading') : cabinet?.name }}
              </h1>
              <StatusBadge v-if="cabinet" :status="cabinet.status">
                {{
                  t(`locations.common.status${cabinet.status === 'active' ? 'Active' : 'Inactive'}`)
                }}
              </StatusBadge>
            </div>
            <p class="mt-0.5 text-sm font-sans text-text-secondary">
              {{
                cabinet
                  ? t('locations.drawers.subtitleWithRoom', { room: cabinet.roomName })
                  : t('locations.drawers.subtitle')
              }}
            </p>
          </div>
        </div>
        <button
          type="button"
          class="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-display font-medium text-white transition-colors hover:bg-primary-mid"
          @click="openCreate"
        >
          <Plus class="h-4 w-4" />
          {{ t('locations.drawers.addDrawer') }}
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-[15px]">
        <AppSelect v-model="statusFilter" :options="statusOptions" class="w-full sm:w-[170px]" />
      </div>

      <AppErrorState
        v-if="error"
        :title="t('locations.common.errorTitle')"
        :description="error"
        :retry-label="t('locations.common.retry')"
        @retry="refresh"
      />
      <AppEmptyState
        v-else-if="isEmpty"
        :title="
          hasActiveFilters
            ? t('locations.common.noMatchesTitle')
            : t('locations.drawers.emptyTitle')
        "
        :description="
          hasActiveFilters
            ? t('locations.common.noMatchesDescription')
            : t('locations.drawers.emptyDescription')
        "
        :icon="Inbox"
      >
        <template v-if="!hasActiveFilters" #action>
          <button
            type="button"
            class="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-display font-medium text-white transition-colors hover:bg-primary-mid"
            @click="openCreate"
          >
            <Plus class="h-4 w-4" />
            {{ t('locations.drawers.addDrawer') }}
          </button>
        </template>
      </AppEmptyState>
      <template v-else>
        <DrawersTable :drawers="drawers" :loading="loading" @edit="openEdit" @delete="openDelete" />
        <AppPagination
          v-if="totalPages > 1"
          v-model:current-page="page"
          :total-pages="totalPages"
        />
      </template>
    </template>
  </div>

  <DrawerFormDialog
    :open="dialogOpen"
    :drawer="editingDrawer"
    :cabinet-name="cabinet?.name ?? ''"
    :saving="saving"
    @close="dialogOpen = false"
    @save="handleSave"
  />

  <AppConfirmDialog
    :open="deleteDialogOpen"
    :title="t('locations.drawers.deleteTitle')"
    :confirm-label="t('locations.common.delete')"
    confirm-class="bg-danger text-white hover:opacity-80"
    @close="deleteDialogOpen = false"
    @confirm="confirmDelete"
  >
    <p class="text-sm font-sans text-text-secondary">
      {{ t('locations.drawers.deleteMessage', { number: deletingDrawer?.number ?? '' }) }}
    </p>
  </AppConfirmDialog>
</template>
