<script setup lang="ts">
import { SquarePen, Ban, CircleCheck, ListFilter } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import DataTable from '@/shared/components/DataTable.vue'
import StatusBadge from '@/shared/components/StatusBadge.vue'
import type { DocumentType, DocumentTypeStatus } from '../types'

defineProps<{
  items: DocumentType[]
  loading?: boolean
}>()

const emit = defineEmits<{
  edit: [item: DocumentType]
  delete: [item: DocumentType]
}>()

const { t } = useI18n()

/**
 * `StatusBadge` falls back to printing the raw slug when no slot is given,
 * which leaks an untranslated "active"/"inactive" into the Arabic UI.
 */
function statusLabel(status: DocumentTypeStatus): string {
  return t(`documentTypes.status.${status}`)
}
</script>

<template>
  <DataTable
    :loading="loading"
    :columns="[
      { key: 'name', label: t('documentTypes.fields.name') },
      { key: 'required', label: t('documentTypes.fields.isRequired'), align: 'center' },
      { key: 'conditions', label: t('documentTypes.conditions.label'), align: 'center' },
      { key: 'status', label: t('documentTypes.fields.status'), align: 'center' },
      { key: 'actions', label: t('documentTypes.table.actions'), align: 'center' },
    ]"
  >
    <template #rows>
      <tr v-for="item in items" :key="item.id" class="border-t border-border hover:bg-surface">
        <td class="px-3 py-3 text-sm font-sans text-text-primary">
          <p class="font-medium">{{ item.name }}</p>
          <p v-if="item.description" class="text-xs text-text-secondary truncate max-w-xs">
            {{ item.description }}
          </p>
        </td>
        <td class="px-3 py-3 text-center">
          <CircleCheck v-if="item.isRequired" class="inline w-5 h-5 text-success-text" />
          <span v-else class="text-sm text-text-muted">{{
            t('documentTypes.fields.optional')
          }}</span>
        </td>
        <td class="px-3 py-3 text-center">
          <span
            v-if="item.requirementConditions"
            class="inline-flex items-center gap-1 text-xs text-text-secondary"
            :title="
              t('documentTypes.conditions.tooltip', {
                count: item.requirementConditions.conditions.length,
              })
            "
          >
            <ListFilter class="w-4 h-4" />
            {{ item.requirementConditions.conditions.length }}
          </span>
          <!--
            A stored rule the builder cannot express (verified live: two seeded
            rows hold the legacy `{"applies_to": …}` shape) maps to a null
            `requirementConditions`. Showing the same "—" as a row with no rule
            at all was the one place the table said something untrue — the rule
            is there, it is enforced, and an edit deliberately preserves it.
          -->
          <span
            v-else-if="item.hasUnsupportedConditions"
            class="inline-flex items-center gap-1 text-xs text-text-secondary"
            :title="t('documentTypes.conditions.customTooltip')"
          >
            <ListFilter class="w-4 h-4" />
            {{ t('documentTypes.conditions.custom') }}
          </span>
          <span v-else class="text-xs text-text-muted">—</span>
        </td>
        <td class="px-3 py-3 text-center">
          <StatusBadge :status="item.status">{{ statusLabel(item.status) }}</StatusBadge>
        </td>
        <td class="px-3 py-3">
          <div class="flex justify-center items-center gap-[15px]">
            <button
              class="text-[#4285F4] hover:opacity-70 transition-opacity"
              :title="t('documentTypes.table.edit')"
              @click="emit('edit', item)"
            >
              <SquarePen class="w-5 h-5" />
            </button>
            <button
              class="text-danger hover:opacity-70 transition-opacity"
              :title="t('documentTypes.table.delete')"
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
