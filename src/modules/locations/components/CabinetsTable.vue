<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronRight, SquarePen, Trash2 } from 'lucide-vue-next'
import DataTable from '@/shared/components/DataTable.vue'
import StatusBadge from '@/shared/components/StatusBadge.vue'
import type { Cabinet } from '../types'

defineProps<{
  cabinets: Cabinet[]
  loading?: boolean
}>()

const emit = defineEmits<{
  view: [cabinet: Cabinet]
  edit: [cabinet: Cabinet]
  delete: [cabinet: Cabinet]
}>()

const { t } = useI18n()

// See RoomsTable: `computed` so the headers follow a locale switch.
const columns = computed(() => [
  { key: 'name', label: t('locations.cabinets.columns.name') },
  { key: 'position', label: t('locations.cabinets.columns.position'), align: 'center' as const },
  { key: 'drawers', label: t('locations.cabinets.columns.drawers'), align: 'center' as const },
  { key: 'status', label: t('locations.cabinets.columns.status'), align: 'center' as const },
  { key: 'actions', label: t('locations.common.actions'), align: 'center' as const },
])
</script>

<template>
  <DataTable :columns="columns" :loading="loading">
    <template #rows>
      <tr
        v-for="cabinet in cabinets"
        :key="cabinet.id"
        class="cursor-pointer border-t border-border hover:bg-surface"
        @click="emit('view', cabinet)"
      >
        <td class="px-3 py-3 text-sm font-sans font-medium text-text-primary">
          {{ cabinet.name }}
        </td>
        <td class="px-3 py-3 text-center text-sm font-sans text-text-secondary">
          ({{ cabinet.positionX }}, {{ cabinet.positionY }})
        </td>
        <td class="px-3 py-3 text-center text-sm font-sans text-text-secondary">
          {{ cabinet.drawersCount }}
        </td>
        <td class="px-3 py-3 text-center">
          <StatusBadge :status="cabinet.status">
            {{ t(`locations.common.status${cabinet.status === 'active' ? 'Active' : 'Inactive'}`) }}
          </StatusBadge>
        </td>
        <td class="px-3 py-3">
          <div class="flex items-center justify-center gap-3">
            <button
              type="button"
              class="text-[#4285F4] transition-opacity hover:opacity-70"
              :title="t('locations.cabinets.viewDrawers')"
              @click.stop="emit('view', cabinet)"
            >
              <!-- Drill-in chevron points at the content; mirror it under dir="rtl". -->
              <ChevronRight class="h-5 w-5 rtl:rotate-180" />
            </button>
            <button
              type="button"
              class="text-[#4285F4] transition-opacity hover:opacity-70"
              :title="t('locations.common.edit')"
              @click.stop="emit('edit', cabinet)"
            >
              <SquarePen class="h-5 w-5" />
            </button>
            <button
              type="button"
              class="text-danger transition-opacity hover:opacity-70"
              :title="t('locations.common.delete')"
              @click.stop="emit('delete', cabinet)"
            >
              <Trash2 class="h-5 w-5" />
            </button>
          </div>
        </td>
      </tr>
    </template>
  </DataTable>
</template>
