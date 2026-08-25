<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ChevronRight, SquarePen, Trash2 } from 'lucide-vue-next'
import DataTable from '@/shared/components/DataTable.vue'
import StatusBadge from '@/shared/components/StatusBadge.vue'
import type { Room } from '../types'

defineProps<{
  rooms: Room[]
  loading?: boolean
}>()

const emit = defineEmits<{
  view: [room: Room]
  edit: [room: Room]
  delete: [room: Room]
}>()

const { t } = useI18n()

const columns = [
  { key: 'name', label: t('locations.rooms.columns.name') },
  { key: 'description', label: t('locations.rooms.columns.description') },
  { key: 'cabinets', label: t('locations.rooms.columns.cabinets'), align: 'center' as const },
  { key: 'status', label: t('locations.rooms.columns.status'), align: 'center' as const },
  { key: 'actions', label: t('locations.common.actions'), align: 'center' as const },
]
</script>

<template>
  <DataTable :columns="columns" :loading="loading">
    <template #rows>
      <tr
        v-for="room in rooms"
        :key="room.id"
        class="cursor-pointer border-t border-border hover:bg-surface"
        @click="emit('view', room)"
      >
        <td class="px-3 py-3 text-sm font-sans font-medium text-text-primary">
          {{ room.name }}
        </td>
        <td class="max-w-xs truncate px-3 py-3 text-sm font-sans text-text-secondary">
          {{ room.description || '-' }}
        </td>
        <td class="px-3 py-3 text-center text-sm font-sans text-text-secondary">
          {{ room.cabinetsCount }}
        </td>
        <td class="px-3 py-3 text-center">
          <StatusBadge :status="room.status">
            {{ t(`locations.common.status${room.status === 'active' ? 'Active' : 'Inactive'}`) }}
          </StatusBadge>
        </td>
        <td class="px-3 py-3">
          <div class="flex items-center justify-center gap-3">
            <button
              type="button"
              class="text-[#4285F4] transition-opacity hover:opacity-70"
              :title="t('locations.rooms.viewCabinets')"
              @click.stop="emit('view', room)"
            >
              <ChevronRight class="h-5 w-5" />
            </button>
            <button
              type="button"
              class="text-[#4285F4] transition-opacity hover:opacity-70"
              :title="t('locations.common.edit')"
              @click.stop="emit('edit', room)"
            >
              <SquarePen class="h-5 w-5" />
            </button>
            <button
              type="button"
              class="text-danger transition-opacity hover:opacity-70"
              :title="t('locations.common.delete')"
              @click.stop="emit('delete', room)"
            >
              <Trash2 class="h-5 w-5" />
            </button>
          </div>
        </td>
      </tr>
    </template>
  </DataTable>
</template>
