<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CheckCircle2, Download, X } from 'lucide-vue-next'
import AppButton from '@/shared/components/AppButton.vue'
import AppEmptyState from '@/shared/components/AppEmptyState.vue'
import AppErrorState from '@/shared/components/AppErrorState.vue'
import DataTable from '@/shared/components/DataTable.vue'
import type { ImportRowError } from '../types'

const props = defineProps<{
  rows: ImportRowError[]
  loading: boolean
  error: string | null
  downloading: boolean
}>()

const emit = defineEmits<{ retry: []; close: []; download: [] }>()

const { t } = useI18n()

const columns = computed(() => [
  { key: 'row', label: t('imports.errors.row') },
  { key: 'attribute', label: t('imports.errors.column') },
  { key: 'message', label: t('imports.errors.message') },
  { key: 'data', label: t('imports.errors.rowData') },
])

const hasRows = computed(() => props.rows.length > 0)

function entries(row: ImportRowError): Array<[string, string]> {
  return Object.entries(row.rowData)
}
</script>

<template>
  <section class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="font-display text-lg font-semibold text-text-primary">
        {{ t('imports.errors.title') }}
      </h2>
      <div class="flex items-center gap-2">
        <AppButton variant="ghost" size="sm" :loading="downloading" @click="emit('download')">
          <Download class="h-4 w-4" />
          {{ t('imports.actions.downloadErrors') }}
        </AppButton>
        <AppButton variant="ghost" size="sm" @click="emit('close')">
          <X class="h-4 w-4" />
          {{ t('imports.actions.hideErrors') }}
        </AppButton>
      </div>
    </div>

    <p class="text-xs text-text-secondary font-sans">{{ t('imports.errors.sourceNote') }}</p>

    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="index in 3" :key="index" class="h-10 animate-pulse rounded-[8px] bg-surface" />
    </div>

    <AppErrorState
      v-else-if="error"
      compact
      :title="t('imports.errors.loadFailed')"
      :description="error"
      :retry-label="t('imports.actions.retry')"
      @retry="emit('retry')"
    />

    <DataTable v-else-if="hasRows" :columns="columns">
      <template #rows>
        <tr
          v-for="(row, index) in rows"
          :key="`${row.rowNumber ?? 'row'}-${index}`"
          class="border-t border-border align-top hover:bg-surface"
        >
          <td class="px-3 py-3 text-start text-sm font-sans text-text-secondary">
            {{ row.rowNumber ?? '—' }}
          </td>
          <td class="px-3 py-3 text-sm font-sans text-text-primary">
            <code>{{ row.attribute || '—' }}</code>
          </td>
          <td class="px-3 py-3 text-sm font-sans text-danger">{{ row.message }}</td>
          <td class="px-3 py-3 text-sm font-sans">
            <ul class="flex flex-wrap gap-1.5">
              <li
                v-for="[key, value] in entries(row)"
                :key="key"
                class="inline-flex max-w-[14rem] items-center gap-1 rounded border border-border bg-surface px-2 py-0.5 text-xs"
              >
                <span class="text-text-secondary">{{ key }}</span>
                <span class="truncate text-text-primary">{{ value || '—' }}</span>
              </li>
            </ul>
          </td>
        </tr>
      </template>
    </DataTable>

    <AppEmptyState
      v-else
      compact
      :icon="CheckCircle2"
      :title="t('imports.errors.emptyTitle')"
      :description="t('imports.errors.emptyDescription')"
    />
  </section>
</template>
