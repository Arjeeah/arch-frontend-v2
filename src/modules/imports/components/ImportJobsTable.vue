<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Download, FileClock, ListX, RefreshCw, X } from 'lucide-vue-next'
import DataTable from '@/shared/components/DataTable.vue'
import AppEmptyState from '@/shared/components/AppEmptyState.vue'
import { relativeTime } from '@/shared/utils/date'
import ImportStatusBadge from './ImportStatusBadge.vue'
import { isImportInFlight } from '../types'
import type { ImportJob } from '../types'

const props = defineProps<{
  jobs: ImportJob[]
  /** Job whose failed rows are currently shown below the table. */
  openErrorsJobId: string | null
  /** Job whose error sheet is being fetched, if any. */
  downloadingErrorsId: string | null
}>()

const emit = defineEmits<{
  viewErrors: [jobId: string]
  downloadErrors: [jobId: string]
  refresh: [jobId: string]
  remove: [jobId: string]
}>()

const { t, locale } = useI18n()

const columns = computed(() => [
  { key: 'entity', label: t('imports.table.entity') },
  { key: 'file', label: t('imports.table.file') },
  { key: 'status', label: t('imports.table.status') },
  { key: 'progress', label: t('imports.table.progress') },
  { key: 'started', label: t('imports.table.started') },
  { key: 'actions', label: t('imports.table.actions'), align: 'center' as const },
])

// `numberingSystem` is pinned for the same reason every other formatter in this
// app pins it: the rest of the UI renders Western digits under `ar`, and CLDR's
// default for `ar` has moved between releases.
const numberFormat = computed(
  () => new Intl.NumberFormat(locale.value, { numberingSystem: 'latn' }),
)

function entityLabel(job: ImportJob): string {
  return job.entity ? t(`imports.entities.${job.entity}`) : t('imports.table.unknownEntity')
}

/** Share of processed rows that succeeded — the bar is relative to progress so far. */
function successPercent(job: ImportJob): number {
  if (job.processedCount <= 0) return 0
  return Math.round((job.successCount / job.processedCount) * 100)
}

const hasJobs = computed(() => props.jobs.length > 0)
</script>

<template>
  <div>
    <DataTable v-if="hasJobs" :columns="columns">
      <template #rows>
        <tr
          v-for="job in jobs"
          :key="job.id"
          class="border-t border-border align-top hover:bg-surface"
          :class="{ 'bg-highlight/20': job.id === openErrorsJobId }"
        >
          <td class="px-3 py-3 text-sm font-sans text-text-primary">{{ entityLabel(job) }}</td>
          <td class="px-3 py-3 text-sm font-sans text-text-secondary">
            <span class="block max-w-[16rem] truncate" :title="job.fileName ?? ''">
              {{ job.fileName ?? '—' }}
            </span>
          </td>
          <td class="px-3 py-3 text-sm font-sans">
            <ImportStatusBadge :status="job.status" />
          </td>
          <td class="px-3 py-3 text-sm font-sans">
            <div class="flex min-w-[11rem] flex-col gap-1">
              <div class="flex h-1.5 w-full overflow-hidden rounded-full bg-surface-input">
                <div class="h-full bg-success" :style="{ width: `${successPercent(job)}%` }" />
                <div
                  class="h-full bg-danger"
                  :style="{ width: `${100 - successPercent(job)}%` }"
                  :class="{ 'opacity-0': job.processedCount === 0 }"
                />
              </div>
              <p class="text-xs text-text-secondary">
                {{
                  t('imports.table.counts', {
                    processed: numberFormat.format(job.processedCount),
                    success: numberFormat.format(job.successCount),
                    failed: numberFormat.format(job.errorCount),
                  })
                }}
              </p>
            </div>
          </td>
          <td class="px-3 py-3 text-sm font-sans text-text-secondary">
            {{ relativeTime(job.startedAt, locale) }}
          </td>
          <td class="px-3 py-3 text-sm font-sans">
            <div class="flex items-center justify-center gap-1">
              <button
                v-if="job.errorCount > 0"
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded text-danger transition-colors hover:bg-surface"
                :title="t('imports.actions.viewErrors')"
                :aria-label="t('imports.actions.viewErrors')"
                @click="emit('viewErrors', job.id)"
              >
                <ListX class="h-4 w-4" />
              </button>
              <button
                v-if="job.errorCount > 0"
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded text-primary transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
                :title="t('imports.actions.downloadErrors')"
                :aria-label="t('imports.actions.downloadErrors')"
                :disabled="downloadingErrorsId === job.id"
                @click="emit('downloadErrors', job.id)"
              >
                <Download class="h-4 w-4" />
              </button>
              <button
                v-if="isImportInFlight(job.status)"
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded text-text-secondary transition-colors hover:bg-surface"
                :title="t('imports.actions.refresh')"
                :aria-label="t('imports.actions.refresh')"
                @click="emit('refresh', job.id)"
              >
                <RefreshCw class="h-4 w-4" />
              </button>
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded text-text-secondary transition-colors hover:bg-surface hover:text-danger"
                :title="t('imports.actions.remove')"
                :aria-label="t('imports.actions.remove')"
                @click="emit('remove', job.id)"
              >
                <X class="h-4 w-4" />
              </button>
            </div>
          </td>
        </tr>
      </template>
    </DataTable>

    <AppEmptyState
      v-else
      :icon="FileClock"
      :title="t('imports.empty.title')"
      :description="t('imports.empty.description')"
    />
  </div>
</template>
