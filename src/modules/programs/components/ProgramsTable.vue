<script setup lang="ts">
import { SquarePen, Ban } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import DataTable from '@/shared/components/DataTable.vue'
import StatusBadge from '@/shared/components/StatusBadge.vue'
import type { Program, ProgramStatus } from '../types'

defineProps<{
  items: Program[]
  loading?: boolean
}>()

const emit = defineEmits<{
  edit: [item: Program]
  delete: [item: Program]
}>()

const { t } = useI18n()

/**
 * `StatusBadge` falls back to printing the raw slug when no slot is given,
 * which leaks an untranslated "active"/"inactive" into the Arabic UI.
 */
function statusLabel(status: ProgramStatus): string {
  return t(`programs.status.${status}`)
}
</script>

<template>
  <DataTable
    :loading="loading"
    :columns="[
      { key: 'code', label: t('programs.fields.code') },
      { key: 'name', label: t('programs.fields.name') },
      { key: 'faculty', label: t('programs.fields.faculty') },
      { key: 'status', label: t('programs.fields.status'), align: 'center' },
      { key: 'actions', label: t('programs.table.actions'), align: 'center' },
    ]"
  >
    <template #rows>
      <tr v-for="item in items" :key="item.id" class="border-t border-border hover:bg-surface">
        <td class="px-3 py-3 text-sm font-sans text-text-primary">{{ item.code }}</td>
        <td class="px-3 py-3 text-sm font-sans text-text-primary">
          <p>{{ item.nameAr }}</p>
          <p class="text-xs text-text-secondary">{{ item.nameEn }}</p>
        </td>
        <td class="px-3 py-3 text-sm font-sans text-text-secondary">
          <span v-if="item.faculty">{{ item.faculty.nameAr }} — {{ item.faculty.nameEn }}</span>
          <span v-else class="text-text-muted">—</span>
        </td>
        <td class="px-3 py-3 text-center">
          <StatusBadge :status="item.status">{{ statusLabel(item.status) }}</StatusBadge>
        </td>
        <td class="px-3 py-3">
          <div class="flex justify-center items-center gap-[15px]">
            <button
              class="text-[#4285F4] hover:opacity-70 transition-opacity"
              :title="t('programs.table.edit')"
              @click="emit('edit', item)"
            >
              <SquarePen class="w-5 h-5" />
            </button>
            <button
              class="text-danger hover:opacity-70 transition-opacity"
              :title="t('programs.table.delete')"
              @click="emit('delete', item)"
            >
              <Ban class="w-5 h-5" />
            </button>
          </div>
        </td>
      </tr>
    </template>
  </DataTable>
</template>
