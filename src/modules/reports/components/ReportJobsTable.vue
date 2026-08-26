<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Download, FileClock, RefreshCw, X } from 'lucide-vue-next'
import DataTable from '@/shared/components/DataTable.vue'
import AppEmptyState from '@/shared/components/AppEmptyState.vue'
import { formatDate, relativeTime } from '@/shared/utils/date'
import ReportStatusBadge from './ReportStatusBadge.vue'
import { REPORT_TYPE_KEYS, isJobInFlight } from '../types'
import type { ReportJob } from '../types'

const props = defineProps<{
  jobs: ReportJob[]
  /** Id of the job whose file is currently being fetched, if any. */
  downloadingId: string | null
}>()

const emit = defineEmits<{
  download: [job: ReportJob]
  refresh: [jobId: string]
  remove: [jobId: string]
}>()

const { t, locale } = useI18n()

const columns = computed(() => [
  { key: 'type', label: t('reports.table.type') },
  { key: 'format', label: t('reports.table.format') },
  { key: 'status', label: t('reports.table.status') },
  { key: 'rows', label: t('reports.table.rows') },
  { key: 'created', label: t('reports.table.created') },
  { key: 'expires', label: t('reports.table.expires') },
  { key: 'actions', label: t('reports.table.actions'), align: 'center' as const },
])

// `numberingSystem` is pinned for the same reason every other formatter in this
// app pins it: the rest of the UI renders Western digits under `ar`, and CLDR's
// default for `ar` has moved between releases.
const numberFormat = computed(
  () => new Intl.NumberFormat(locale.value, { numberingSystem: 'latn' }),
)

/** Falls back to the raw key for a type this build does not know about. */
function typeLabel(type: string): string {
  return (REPORT_TYPE_KEYS as readonly string[]).includes(type) ? t(`reports.types.${type}`) : type
}

function isExpired(job: ReportJob): boolean {
  return job.expiresAt !== null && new Date(job.expiresAt).getTime() < Date.now()
}

function canDownload(job: ReportJob): boolean {
  return job.status === 'completed' && job.downloadUrl !== null && !isExpired(job)
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
        >
          <td class="px-3 py-3 text-sm font-sans text-text-primary">
            {{ typeLabel(job.type) }}
          </td>
          <td class="px-3 py-3 text-sm font-sans uppercase text-text-secondary">
            {{ job.format }}
          </td>
          <td class="px-3 py-3 text-sm font-sans">
            <ReportStatusBadge :status="job.status" />
            <p v-if="job.errorMessage" class="mt-1 max-w-[22rem] text-xs text-danger">
              {{ job.errorMessage }}
            </p>
          </td>
          <td class="px-3 py-3 text-sm font-sans text-text-secondary">
            {{ job.rowCount === null ? '—' : numberFormat.format(job.rowCount) }}
          </td>
          <td class="px-3 py-3 text-sm font-sans text-text-secondary">
            {{ relativeTime(job.createdAt, locale) }}
          </td>
          <td class="px-3 py-3 text-sm font-sans">
            <span v-if="isExpired(job)" class="text-danger">{{ t('reports.table.expired') }}</span>
            <span v-else class="text-text-secondary">{{ formatDate(job.expiresAt) }}</span>
          </td>
          <td class="px-3 py-3 text-sm font-sans">
            <div class="flex items-center justify-center gap-1">
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded text-primary transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
                :title="t('reports.actions.download')"
                :aria-label="t('reports.actions.download')"
                :disabled="!canDownload(job) || downloadingId === job.id"
                @click="emit('download', job)"
              >
                <Download class="h-4 w-4" />
              </button>
              <button
                v-if="isJobInFlight(job.status)"
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded text-text-secondary transition-colors hover:bg-surface"
                :title="t('reports.actions.refresh')"
                :aria-label="t('reports.actions.refresh')"
                @click="emit('refresh', job.id)"
              >
                <RefreshCw class="h-4 w-4" />
              </button>
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded text-text-secondary transition-colors hover:bg-surface hover:text-danger"
                :title="t('reports.actions.remove')"
                :aria-label="t('reports.actions.remove')"
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
      :title="t('reports.empty.title')"
      :description="t('reports.empty.description')"
    />
  </div>
</template>
