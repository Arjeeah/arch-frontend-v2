<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import {
  CircleCheck,
  FileStack,
  LoaderCircle,
  RefreshCw,
  TriangleAlert,
  Upload,
} from 'lucide-vue-next'
import AppStatCard from '@/shared/components/AppStatCard.vue'
import AppButton from '@/shared/components/AppButton.vue'
import AppSelect from '@/shared/components/AppSelect.vue'
import SearchBar from '@/shared/components/SearchBar.vue'
import AppPagination from '@/shared/components/AppPagination.vue'
import AppEmptyState from '@/shared/components/AppEmptyState.vue'
import AppErrorState from '@/shared/components/AppErrorState.vue'
import { useServerTable } from '@/shared/composables/useServerTable'
import { useDebouncedRef } from '@/shared/composables/useDebouncedRef'
import { useToasts } from '@/shared/composables/useToasts'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import { pipelineApi } from '../api/pipelineApi'
import { usePolling } from '../composables/usePolling'
import { PIPELINE_STATUSES, isInFlightStatus, isPipelineStatus } from '../status'
import { formatCount } from '../format'
import {
  FILE_STATUSES,
  type DocumentPipelineStatus,
  type PipelineDocument,
  type PipelineDocumentFilters,
  type PipelineStatusCounts,
} from '../types'
import PipelineStatusBreakdown from '../components/PipelineStatusBreakdown.vue'
import PipelineDocumentsTable from '../components/PipelineDocumentsTable.vue'

/** Kept in step with the route the integrator adds — see WIRING.md. */
const UPLOAD_PATH = '/pipeline/import'

/**
 * How often the monitor re-reads state while documents are still moving.
 *
 * The seconds value reaches `pipeline.monitor.live` as plain interpolation, not
 * as a plural choice — the badge is the only place it is rendered and 10 is a
 * constant, so the Arabic copy is written for exactly this number (CLDR *few*,
 * i.e. 3–10 → "ثوانٍ"). Change this and the Arabic string needs revisiting, or
 * `pipeline.monitor.live` needs the six-form treatment described in CLAUDE.md.
 */
const POLL_INTERVAL_MS = 10_000

const { t, locale } = useI18n()
const toasts = useToasts()

// --- Archive-wide state counts ---------------------------------------------

const emptyCounts = (): PipelineStatusCounts =>
  Object.fromEntries(PIPELINE_STATUSES.map((s) => [s, 0])) as PipelineStatusCounts

const counts = ref<PipelineStatusCounts>(emptyCounts())
const countsLoading = ref(true)
const countsError = ref<string | null>(null)

async function loadCounts(): Promise<void> {
  try {
    counts.value = await pipelineApi.statusCounts()
    countsError.value = null
  } catch (err: unknown) {
    countsError.value = getApiErrorMessage(err, t('pipeline.monitor.countsError'))
  } finally {
    countsLoading.value = false
  }
}

const totalDocuments = computed(() =>
  PIPELINE_STATUSES.reduce((sum, status) => sum + counts.value[status], 0),
)
const inFlightTotal = computed(() =>
  PIPELINE_STATUSES.reduce(
    (sum, status) => (isInFlightStatus(status) ? sum + counts.value[status] : sum),
    0,
  ),
)

/** The signal that decides whether the poll runs: work is still in motion. */
const hasWorkInFlight = computed(() => inFlightTotal.value > 0)

// --- Document list ----------------------------------------------------------

const table = useServerTable<PipelineDocument>(pipelineApi.listDocuments, {
  perPage: 15,
  errorFallback: t('pipeline.monitor.listError'),
})

const search = ref('')
const debouncedSearch = useDebouncedRef(search)
const fileStatus = ref('')

/**
 * `setFilters` takes a bare `Record<string, unknown>`, so a misspelt key would
 * be accepted and then silently dropped by `toDocumentQuery` — the filter would
 * just stop working. Going through the module's own filter type makes the two
 * ends fail to compile instead.
 */
function applyFilters(next: PipelineDocumentFilters): void {
  table.setFilters(next)
}

watch(debouncedSearch, (value) => applyFilters({ fileNumber: value }))
watch(fileStatus, (value) => applyFilters({ fileStatus: value }))

const fileStatusOptions = computed(() => [
  { value: '', label: t('pipeline.monitor.allFileStatuses') },
  ...FILE_STATUSES.map((value) => ({ value, label: t(`pipeline.fileStatus.${value}`) })),
])

// --- Per-row pipeline status hydration -------------------------------------
//
// `/v1/student-documents` does not carry `pipeline_status`, so the state of
// every visible row is fetched separately. See `pipelineApi.listDocuments`.

const statuses = ref<Map<string, DocumentPipelineStatus>>(new Map())
const statusesLoading = ref(false)
let hydrationToken = 0

/**
 * `silent` skips the skeletons: a poll tick refreshing states that are already
 * on screen should update them in place, not blink the whole column.
 */
async function hydrateStatuses(rows: PipelineDocument[], silent = false): Promise<void> {
  const token = ++hydrationToken

  if (rows.length === 0) {
    statuses.value = new Map()
    statusesLoading.value = false
    return
  }

  if (!silent) statusesLoading.value = true
  try {
    const next = await pipelineApi.documentStatuses(rows.map((row) => row.id))
    if (token !== hydrationToken) return
    statuses.value = next
  } finally {
    if (token === hydrationToken) statusesLoading.value = false
  }
}

watch(
  () => table.rows.value,
  (rows) => void hydrateStatuses(rows),
)

// --- Page-scoped pipeline-state filter --------------------------------------
//
// The backend cannot filter documents by pipeline state, so this narrows the
// rows already loaded. The hint beside the control says so, and the counts
// above stay archive-wide — the two numbers are answering different questions.

const stateFilter = ref('')

const stateFilterOptions = computed(() => [
  { value: '', label: t('pipeline.monitor.allStates') },
  ...PIPELINE_STATUSES.map((value) => ({ value, label: t(`common.pipelineStatus.${value}`) })),
])

const visibleRows = computed(() => {
  const selected = stateFilter.value
  if (!isPipelineStatus(selected)) return table.rows.value
  return table.rows.value.filter((row) => statuses.value.get(row.id)?.status === selected)
})

const isFilteringPage = computed(() => isPipelineStatus(stateFilter.value))

// --- Retry -------------------------------------------------------------------

const retryingId = ref<string | null>(null)

async function retry(id: string): Promise<void> {
  retryingId.value = id
  try {
    await pipelineApi.retry(id)
    toasts.success(t('pipeline.monitor.retryToast'))

    // The document has just been re-dispatched, so both its own state and the
    // archive-wide tallies are stale the moment the request returns.
    const [status] = await Promise.allSettled([pipelineApi.documentStatus(id), loadCounts()])
    if (status.status === 'fulfilled') {
      statuses.value = new Map(statuses.value).set(id, status.value)
    }
  } catch (err: unknown) {
    toasts.error(getApiErrorMessage(err, t('pipeline.monitor.retryError')))
  } finally {
    retryingId.value = null
  }
}

// --- Auto-poll ---------------------------------------------------------------

const { isPolling, start, stop } = usePolling(async () => {
  await Promise.all([loadCounts(), hydrateStatuses(table.rows.value, true)])
}, POLL_INTERVAL_MS)

watch(hasWorkInFlight, (busy) => (busy ? start() : stop()), { immediate: false })

async function refreshAll(): Promise<void> {
  await Promise.all([loadCounts(), table.refresh()])
}

onMounted(async () => {
  await loadCounts()
  if (hasWorkInFlight.value) start()
})
</script>

<template>
  <div class="flex flex-col gap-6 pb-10">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="font-display text-2xl font-semibold text-text-primary">
          {{ t('pipeline.monitor.title') }}
        </h1>
        <p class="mt-1 font-sans text-sm text-text-secondary">
          {{ t('pipeline.monitor.subtitle') }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <span
          v-if="isPolling"
          class="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-1 font-sans text-xs font-medium text-success-text"
          role="status"
        >
          <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
          {{ t('pipeline.monitor.live', { seconds: POLL_INTERVAL_MS / 1000 }) }}
        </span>

        <AppButton variant="ghost" size="md" :loading="table.loading.value" @click="refreshAll">
          <RefreshCw class="h-4 w-4" />
          {{ t('pipeline.monitor.refresh') }}
        </AppButton>

        <RouterLink
          :to="UPLOAD_PATH"
          class="inline-flex items-center gap-2 rounded bg-primary-mid px-3 py-1.5 font-sans text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Upload class="h-4 w-4" />
          {{ t('pipeline.monitor.importAction') }}
        </RouterLink>
      </div>
    </header>

    <!-- Archive-wide tallies -->
    <AppErrorState
      v-if="countsError"
      compact
      :title="t('pipeline.monitor.countsError')"
      :description="countsError"
      :retry-label="t('pipeline.monitor.refresh')"
      @retry="loadCounts"
    />

    <template v-else>
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <AppStatCard
          :label="t('pipeline.monitor.cards.total')"
          :value="countsLoading ? '—' : formatCount(totalDocuments, locale)"
          :icon="FileStack"
        />
        <AppStatCard
          :label="t('pipeline.monitor.cards.inFlight')"
          :value="countsLoading ? '—' : formatCount(inFlightTotal, locale)"
          :sub-label="t('pipeline.monitor.cards.inFlightHint')"
          :icon="LoaderCircle"
        />
        <AppStatCard
          :label="t('pipeline.monitor.cards.completed')"
          :value="countsLoading ? '—' : formatCount(counts.completed, locale)"
          :icon="CircleCheck"
        />
        <AppStatCard
          :label="t('pipeline.monitor.cards.failed')"
          :value="countsLoading ? '—' : formatCount(counts.failed, locale)"
          :sub-label="counts.failed > 0 ? t('pipeline.monitor.cards.failedHint') : undefined"
          :icon="TriangleAlert"
        />
      </div>

      <PipelineStatusBreakdown :counts="counts" :loading="countsLoading" />
    </template>

    <!-- Documents -->
    <section
      class="flex flex-col overflow-hidden rounded-[10px] border border-border bg-white shadow-sm"
    >
      <div class="flex flex-col gap-4 border-b border-border p-5">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div class="w-full md:w-[320px]">
            <SearchBar v-model="search" :placeholder="t('pipeline.monitor.searchPlaceholder')" />
          </div>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <AppSelect
              v-model="fileStatus"
              :options="fileStatusOptions"
              class="w-full sm:w-[170px]"
            />
            <AppSelect
              v-model="stateFilter"
              :options="stateFilterOptions"
              class="w-full sm:w-[200px]"
            />
          </div>
        </div>

        <p v-if="isFilteringPage" class="font-sans text-xs text-warning">
          {{
            t('pipeline.monitor.pageFilterHint', {
              shown: formatCount(visibleRows.length, locale),
              loaded: formatCount(table.rows.value.length, locale),
            })
          }}
        </p>
      </div>

      <AppErrorState
        v-if="table.error.value"
        :title="t('pipeline.monitor.listError')"
        :description="table.error.value"
        :retry-label="t('pipeline.monitor.refresh')"
        @retry="table.refresh"
      />

      <AppEmptyState
        v-else-if="table.isEmpty.value"
        :icon="FileStack"
        :title="t('pipeline.monitor.emptyTitle')"
        :description="t('pipeline.monitor.emptyBody')"
      >
        <template #action>
          <RouterLink
            :to="UPLOAD_PATH"
            class="inline-flex items-center gap-2 rounded bg-primary-mid px-3 py-1.5 font-sans text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <Upload class="h-4 w-4" />
            {{ t('pipeline.monitor.importAction') }}
          </RouterLink>
        </template>
      </AppEmptyState>

      <!-- `statusesLoading` is part of the condition on purpose: the state
           filter reads the hydrated statuses, so before they land every row
           looks like a non-match and this would flash over a full page. -->
      <AppEmptyState
        v-else-if="!table.loading.value && !statusesLoading && visibleRows.length === 0"
        compact
        :title="t('pipeline.monitor.noneInStateTitle')"
        :description="t('pipeline.monitor.noneInStateBody')"
      >
        <template #action>
          <AppButton variant="ghost" size="sm" @click="stateFilter = ''">
            {{ t('pipeline.monitor.clearStateFilter') }}
          </AppButton>
        </template>
      </AppEmptyState>

      <div v-else class="w-full overflow-x-auto">
        <PipelineDocumentsTable
          :rows="visibleRows"
          :statuses="statuses"
          :loading="table.loading.value || (isFilteringPage && statusesLoading)"
          :statuses-loading="statusesLoading"
          :retrying-id="retryingId"
          @retry="retry"
        />
      </div>

      <div
        v-if="!table.error.value && !table.isEmpty.value"
        class="flex flex-col items-center gap-2 border-t border-border p-4"
      >
        <AppPagination
          v-model:current-page="table.page.value"
          :total-pages="table.totalPages.value"
        />
        <p class="font-sans text-xs text-text-secondary">
          {{
            t(
              'pipeline.monitor.totalRows',
              { total: formatCount(table.total.value, locale) },
              table.total.value,
            )
          }}
        </p>
      </div>
    </section>
  </div>
</template>
