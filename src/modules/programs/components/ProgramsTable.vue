<script setup lang="ts">
import { computed } from 'vue'
import { SquarePen, Ban } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import DataTable from '@/shared/components/DataTable.vue'
import StatusBadge from '@/shared/components/StatusBadge.vue'
import type { Program, ProgramStatus } from '../types'

const props = withDefaults(
  defineProps<{
    items: Program[]
    loading?: boolean
    /**
     * Whether to render the row actions at all. `ProgramPolicy` grants
     * create/update/delete to `super_admin` only — an archivist can read this
     * list but every write answers 403 — so the column is dropped rather than
     * shown disabled. Defaults to `true` so the component stays usable
     * standalone; `ProgramListPage` passes the real answer.
     */
    canWrite?: boolean
  }>(),
  { loading: false, canWrite: true },
)

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

/**
 * Built in script rather than inline so the actions column can be dropped
 * entirely for a reader — `DataTable` renders one header per entry, and a
 * header with no cells under it would knock the row layout out of alignment.
 */
const columns = computed(() => [
  { key: 'code', label: t('programs.fields.code') },
  { key: 'name', label: t('programs.fields.name') },
  { key: 'faculty', label: t('programs.fields.faculty') },
  { key: 'status', label: t('programs.fields.status'), align: 'center' as const },
  ...(props.canWrite
    ? [{ key: 'actions', label: t('programs.table.actions'), align: 'center' as const }]
    : []),
])
</script>

<template>
  <DataTable :loading="loading" :columns="columns">
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
        <td v-if="canWrite" class="px-3 py-3">
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
