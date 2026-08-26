<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SquarePen, Trash2 } from 'lucide-vue-next'
import DataTable from '@/shared/components/DataTable.vue'
import StatusBadge from '@/shared/components/StatusBadge.vue'
import CapacityBadge from './CapacityBadge.vue'
import type { Drawer } from '../types'

defineProps<{
  drawers: Drawer[]
  loading?: boolean
}>()

const emit = defineEmits<{
  edit: [drawer: Drawer]
  delete: [drawer: Drawer]
}>()

const { t } = useI18n()

// See RoomsTable: `computed` so the headers follow a locale switch.
const columns = computed(() => [
  { key: 'number', label: t('locations.drawers.columns.number'), align: 'center' as const },
  { key: 'label', label: t('locations.drawers.columns.label') },
  { key: 'capacity', label: t('locations.drawers.columns.capacity') },
  { key: 'status', label: t('locations.drawers.columns.status'), align: 'center' as const },
  { key: 'actions', label: t('locations.common.actions'), align: 'center' as const },
])
</script>

<template>
  <DataTable :columns="columns" :loading="loading">
    <template #rows>
      <tr
        v-for="drawer in drawers"
        :key="drawer.id"
        class="border-t border-border hover:bg-surface"
      >
        <td class="px-3 py-3 text-center text-sm font-sans font-medium text-text-primary">
          {{ drawer.number }}
        </td>
        <td class="px-3 py-3 text-sm font-sans text-text-secondary">
          {{ drawer.label || '-' }}
        </td>
        <td class="px-3 py-3">
          <CapacityBadge
            :status="drawer.capacityStatus"
            :color="drawer.capacityColor"
            :capacity="drawer.capacity"
          />
        </td>
        <td class="px-3 py-3 text-center">
          <StatusBadge :status="drawer.status">
            {{ t(`locations.common.status${drawer.status === 'active' ? 'Active' : 'Inactive'}`) }}
          </StatusBadge>
        </td>
        <td class="px-3 py-3">
          <div class="flex items-center justify-center gap-3">
            <button
              type="button"
              class="text-[#4285F4] transition-opacity hover:opacity-70"
              :title="t('locations.common.edit')"
              @click="emit('edit', drawer)"
            >
              <SquarePen class="h-5 w-5" />
            </button>
            <button
              type="button"
              class="text-danger transition-opacity hover:opacity-70"
              :title="t('locations.common.delete')"
              @click="emit('delete', drawer)"
            >
              <Trash2 class="h-5 w-5" />
            </button>
          </div>
        </td>
      </tr>
    </template>
  </DataTable>
</template>
