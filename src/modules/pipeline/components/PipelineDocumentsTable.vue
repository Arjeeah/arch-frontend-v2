<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDown, ExternalLink, RefreshCw } from 'lucide-vue-next'
import DataTable from '@/shared/components/DataTable.vue'
import AppButton from '@/shared/components/AppButton.vue'
import { relativeTime } from '@/shared/utils/date'
import { isRetryableStatus } from '../status'
import { formatConfidence, formatCount, intlLocale } from '../format'
import type { DocumentPipelineStatus, PipelineDocument } from '../types'
import PipelineStatusChip from './PipelineStatusChip.vue'

const props = defineProps<{
  rows: PipelineDocument[]
  /** Hydrated pipeline state per document id; a row missing from it is still loading. */
  statuses: Map<string, DocumentPipelineStatus>
  loading?: boolean
  statusesLoading?: boolean
  /** Document currently being retried, so only its button spins. */
  retryingId?: string | null
}>()

const emit = defineEmits<{ retry: [id: string] }>()

const { t, locale } = useI18n()

const expanded = ref<Set<string>>(new Set())

/**
 * Document and its pipeline state paired up once, so the template never has to
 * reach back into the map (and never has to assert the result is there).
 */
const viewRows = computed(() =>
  props.rows.map((document) => {
    const status = props.statuses.get(document.id)
    const canRetry = status !== undefined && isRetryableStatus(status.status)
    return {
      document,
      status,
      canRetry,
      // A row whose state never loaded is disabled for a different reason than
      // one in a non-retryable state; saying "only failed documents" there
      // sends the operator looking for a problem that is not the one they have.
      retryHint:
        status === undefined
          ? t('pipeline.monitor.statusUnavailable')
          : canRetry
            ? t('pipeline.monitor.retry')
            : t('pipeline.monitor.retryUnavailable'),
      isExpanded: expanded.value.has(document.id),
    }
  }),
)

/**
 * Placeholder rows shown while a page loads.
 *
 * `DataTable`'s own `loading` state is deliberately not used: it renders a
 * hard-coded English "Loading…" with no way to translate it, which on an
 * Arabic-first operations screen is the one string an operator sees most often.
 * Rendering the placeholder here keeps it inside the module's i18n.
 */
const SKELETON_ROWS = 5

/** Skeletons replace the rows while a page loads, rather than sitting under them. */
const renderRows = computed(() => (props.loading ? [] : viewRows.value))

// A row that scrolls off the page should not come back expanded when a
// different document later lands in the same position.
watch(
  () => props.rows,
  (rows) => {
    const visible = new Set(rows.map((row) => row.id))
    expanded.value = new Set([...expanded.value].filter((id) => visible.has(id)))
  },
)

const columns = computed(() => [
  { key: 'document', label: t('pipeline.monitor.columns.document') },
  { key: 'student', label: t('pipeline.monitor.columns.student') },
  { key: 'state', label: t('pipeline.monitor.columns.state') },
  { key: 'pages', label: t('pipeline.monitor.columns.pages') },
  { key: 'confidence', label: t('pipeline.monitor.columns.confidence') },
  { key: 'created', label: t('pipeline.monitor.columns.created') },
  { key: 'actions', label: t('pipeline.monitor.columns.actions') },
])

function toggle(id: string): void {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}

/** Long UUIDs are unreadable in a cell; the full value stays in the title attribute. */
function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id
}

/**
 * What the pipeline has produced for a document so far. `apiLabel` is included
 * deliberately: it is the backend's own wording for the state, so any drift
 * between it and the chip's translation is visible right here.
 */
function detailEntries(status: DocumentPipelineStatus): Array<{ label: string; value: string }> {
  return [
    { label: t('pipeline.detail.apiLabel'), value: status.statusLabel },
    { label: t('pipeline.detail.rawStatus'), value: status.status },
    {
      label: t('pipeline.detail.ocrPages'),
      value: status.hasOcrContent
        ? formatCount(status.pageCount, locale.value)
        : t('pipeline.detail.none'),
    },
    {
      label: t('pipeline.detail.embeddedPages'),
      value: formatCount(status.embeddedPageCount, locale.value),
    },
    {
      label: t('pipeline.detail.refinement'),
      value: status.hasRefinement ? t('pipeline.detail.present') : t('pipeline.detail.none'),
    },
    {
      label: t('pipeline.detail.verification'),
      value: status.isVerified
        ? t('pipeline.detail.verifiedBy', {
            name: status.verifiedBy ?? t('pipeline.detail.unknownUser'),
          })
        : t('pipeline.detail.notVerified'),
    },
  ]
}
</script>

<template>
  <DataTable :columns="columns" variant="plain" class="min-w-[900px]">
    <template #rows>
      <tr
        v-for="n in loading ? SKELETON_ROWS : 0"
        :key="`skeleton-${n}`"
        class="border-t border-border"
      >
        <td v-for="(col, index) in columns" :key="col.key" class="px-4 py-3">
          <!-- An explicit width, not `w-full`: the table lays out automatically,
               so a block with `width:auto` contributes no intrinsic width and
               the columns collapse while the page is loading. -->
          <span
            class="block h-4 w-[120px] animate-pulse rounded bg-surface-input"
            :role="index === 0 ? 'status' : undefined"
            :aria-label="index === 0 ? t('pipeline.monitor.loading') : undefined"
            :aria-hidden="index === 0 ? undefined : 'true'"
          />
        </td>
      </tr>

      <template v-for="row in renderRows" :key="row.document.id">
        <tr class="border-t border-border transition-colors hover:bg-surface">
          <!-- Document -->
          <td class="px-4 py-3 align-top text-start">
            <button
              type="button"
              class="flex items-start gap-2 text-start"
              :aria-expanded="row.isExpanded"
              :aria-label="t('pipeline.monitor.toggleDetail')"
              @click="toggle(row.document.id)"
            >
              <ChevronDown
                class="mt-0.5 h-4 w-4 shrink-0 text-text-muted transition-transform"
                :class="{ 'rotate-180': row.isExpanded }"
              />
              <span class="min-w-0">
                <span class="block font-sans text-xs font-medium text-text-primary">
                  {{ row.document.fileNumber ?? t('pipeline.monitor.unnumbered') }}
                </span>
                <span
                  class="block font-sans text-[11px] text-text-secondary"
                  :title="row.document.fileName ?? row.document.id"
                >
                  {{ row.document.fileName ?? shortId(row.document.id) }}
                </span>
              </span>
            </button>
          </td>

          <!-- Student -->
          <td class="px-4 py-3 align-top text-start">
            <template v-if="row.document.studentName || row.document.studentNumber">
              <span class="block font-sans text-xs text-text-primary">
                {{ row.document.studentName ?? '-' }}
              </span>
              <span class="block font-sans text-[11px] text-text-secondary">
                {{ row.document.studentNumber ?? '' }}
              </span>
            </template>
            <span v-else class="font-sans text-xs text-text-muted">
              {{ t('pipeline.monitor.unassigned') }}
            </span>
          </td>

          <!-- Pipeline state -->
          <td class="px-4 py-3 align-top text-start">
            <PipelineStatusChip
              v-if="row.status"
              :status="row.status.status"
              :api-label="row.status.statusLabel"
            />
            <span
              v-else-if="statusesLoading"
              class="inline-block h-5 w-20 animate-pulse rounded-full bg-surface-input"
              :aria-label="t('pipeline.monitor.loading')"
            />
            <span v-else class="font-sans text-xs text-text-muted">
              {{ t('pipeline.monitor.statusUnavailable') }}
            </span>
          </td>

          <!-- OCR pages -->
          <td
            class="px-4 py-3 align-top font-sans text-xs tabular-nums text-text-secondary text-start"
          >
            {{ row.status ? formatCount(row.status.pageCount, locale) : '-' }}
          </td>

          <!-- Refinement confidence -->
          <td
            class="px-4 py-3 align-top font-sans text-xs tabular-nums text-text-secondary text-start"
          >
            {{ formatConfidence(row.status?.confidenceScore, locale) }}
          </td>

          <!-- Created -->
          <td
            class="whitespace-nowrap px-4 py-3 align-top font-sans text-xs text-text-secondary text-start"
          >
            {{ relativeTime(row.document.createdAt, intlLocale(locale)) }}
          </td>

          <!-- Actions -->
          <td class="px-4 py-3 align-top text-start">
            <div class="flex items-center gap-2">
              <AppButton
                variant="ghost"
                size="sm"
                :disabled="!row.canRetry"
                :loading="retryingId === row.document.id"
                :title="row.retryHint"
                @click="emit('retry', row.document.id)"
              >
                <RefreshCw v-if="retryingId !== row.document.id" class="h-3.5 w-3.5" />
                {{ t('pipeline.monitor.retry') }}
              </AppButton>

              <a
                v-if="row.document.fileUrl"
                :href="row.document.fileUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex h-8 w-8 items-center justify-center rounded text-text-secondary transition-colors hover:bg-surface hover:text-primary"
                :title="t('pipeline.monitor.openFile')"
                :aria-label="t('pipeline.monitor.openFile')"
              >
                <ExternalLink class="h-4 w-4" />
              </a>
            </div>
          </td>
        </tr>

        <!-- Expanded detail: the failure reason first, then what the pipeline produced -->
        <tr v-if="row.isExpanded" class="border-t border-border bg-surface">
          <td :colspan="columns.length" class="px-4 py-4">
            <div v-if="row.status" class="flex flex-col gap-4">
              <div
                v-if="row.status.error"
                class="rounded-lg border border-danger/30 bg-danger/5 p-3"
              >
                <p class="font-display text-xs font-semibold text-danger">
                  {{ t('pipeline.detail.errorTitle') }}
                </p>
                <p
                  class="mt-1 whitespace-pre-wrap break-words font-mono text-[11px] text-text-primary"
                >
                  {{ row.status.error }}
                </p>
              </div>

              <dl class="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
                <div v-for="entry in detailEntries(row.status)" :key="entry.label">
                  <dt class="font-sans text-[11px] text-text-secondary">{{ entry.label }}</dt>
                  <dd class="break-words font-sans text-xs text-text-primary">{{ entry.value }}</dd>
                </div>
              </dl>
            </div>

            <p v-else class="font-sans text-xs text-text-muted">
              {{ t('pipeline.monitor.statusUnavailable') }}
            </p>
          </td>
        </tr>
      </template>
    </template>
  </DataTable>
</template>
