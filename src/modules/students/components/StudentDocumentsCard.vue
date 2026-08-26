<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Check, ExternalLink, FileText, Upload, X } from 'lucide-vue-next'
import DataTable from '@/shared/components/DataTable.vue'
import AppEmptyState from '@/shared/components/AppEmptyState.vue'
import AppButton from '@/shared/components/AppButton.vue'
import { formatDate } from '@/shared/utils/date'
import PipelineStatusChip from './PipelineStatusChip.vue'
import { studentLookupsApi } from '../api/studentLookupsApi'
import type { PipelineSnapshot, StudentDocumentSummary } from '../types'

const props = defineProps<{
  studentId: string
  documents: StudentDocumentSummary[]
  /** Document types this student's faculty/program combination requires. */
  requiredDocumentTypes: Array<{ id: string; name: string }>
  canManage?: boolean
}>()

const { t } = useI18n()

const snapshots = ref<Map<string, PipelineSnapshot>>(new Map())
const snapshotsLoading = ref(false)
/** Soft failure: the documents themselves still render without pipeline data. */
const snapshotsFailed = ref(false)

/**
 * `StudentResource` carries no pipeline fields, so each document's AI state is
 * a separate call. A student holds a handful of documents, so this stays a
 * small fan-out — `allSettled` keeps one failure from blanking the rest.
 */
async function loadSnapshots(documents: StudentDocumentSummary[]): Promise<void> {
  if (documents.length === 0) {
    snapshots.value = new Map()
    return
  }
  snapshotsLoading.value = true
  snapshotsFailed.value = false

  const results = await Promise.allSettled(
    documents.map((document) => studentLookupsApi.pipelineStatus(document.id)),
  )

  const next = new Map<string, PipelineSnapshot>()
  let failures = 0
  for (const result of results) {
    if (result.status === 'fulfilled') next.set(result.value.documentId, result.value)
    else failures += 1
  }

  snapshots.value = next
  snapshotsFailed.value = failures === results.length
  snapshotsLoading.value = false
}

watch(
  () => props.documents.map((document) => document.id).join(','),
  () => void loadSnapshots(props.documents),
  { immediate: true },
)

/**
 * `confidence_score` is already a 0–100 percentage —
 * `RefinementData::fromArray` rescales the model's 0.0–1.0 answer before the
 * value ever reaches the column.
 *
 * Treating "1 or less" as an un-rescaled score turned a genuinely hopeless 1%
 * into a reassuring 100% in the green band, on the one screen an archivist
 * uses to decide whether a document needs review. Clamp only.
 */
function confidencePercent(score: number | null | undefined): number | null {
  if (score === null || score === undefined) return null
  return Math.max(0, Math.min(100, Math.round(score)))
}

function confidenceTone(percent: number): string {
  if (percent >= 85) return 'bg-success'
  if (percent >= 60) return 'bg-warning'
  return 'bg-danger'
}

/** One flattened row per document, so the template never re-indexes the map. */
const rows = computed(() =>
  props.documents.map((document) => {
    const snapshot = snapshots.value.get(document.id) ?? null
    return {
      document,
      snapshot,
      confidence: confidencePercent(snapshot?.confidenceScore),
    }
  }),
)

const columns = computed(() => [
  { key: 'fileNumber', label: t('students.documents.columns.fileNumber') },
  { key: 'type', label: t('students.documents.columns.type') },
  { key: 'fileStatus', label: t('students.documents.columns.fileStatus') },
  { key: 'pipeline', label: t('students.documents.columns.pipeline') },
  { key: 'confidence', label: t('students.documents.columns.confidence') },
  { key: 'submitted', label: t('students.documents.columns.submitted') },
  { key: 'open', label: t('students.documents.columns.open'), align: 'right' as const },
])

/** Which required types this student still has no document for. */
const requirementRows = computed(() =>
  props.requiredDocumentTypes.map((type) => ({
    ...type,
    satisfied: props.documents.some((document) => document.documentTypeId === type.id),
  })),
)
</script>

<template>
  <section class="rounded-[10px] border border-border bg-surface-card shadow-sm">
    <header
      class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"
    >
      <div>
        <h2 class="font-display text-base font-semibold text-text-primary">
          {{ t('students.documents.title') }}
        </h2>
        <p class="font-sans text-xs text-text-secondary">
          {{ t('students.documents.count', { count: documents.length }) }}
        </p>
      </div>
      <RouterLink v-if="canManage" :to="`/student-documents/upload?student=${studentId}`">
        <AppButton variant="primary" size="sm">
          <Upload class="h-4 w-4" />
          {{ t('students.documents.upload') }}
        </AppButton>
      </RouterLink>
    </header>

    <!-- Required-document checklist -->
    <div v-if="requirementRows.length" class="border-b border-border px-5 py-4">
      <p class="mb-2 font-display text-xs font-medium text-text-secondary">
        {{ t('students.documents.required') }}
      </p>
      <ul class="flex flex-wrap gap-2">
        <li
          v-for="requirement in requirementRows"
          :key="requirement.id"
          class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-sans text-xs"
          :class="
            requirement.satisfied ? 'bg-success-bg text-success-text' : 'bg-warning/20 text-warning'
          "
        >
          <Check v-if="requirement.satisfied" class="h-3 w-3" />
          <X v-else class="h-3 w-3" />
          {{ requirement.name }}
        </li>
      </ul>
    </div>

    <p
      v-if="snapshotsFailed"
      class="border-b border-border px-5 py-2 font-sans text-xs text-text-secondary"
    >
      {{ t('students.documents.pipelineUnavailable') }}
    </p>

    <AppEmptyState
      v-if="rows.length === 0"
      compact
      :icon="FileText"
      :title="t('students.documents.emptyTitle')"
      :description="t('students.documents.emptyDescription')"
    />

    <DataTable v-else :columns="columns">
      <template #rows>
        <tr
          v-for="row in rows"
          :key="row.document.id"
          class="border-t border-border hover:bg-surface"
        >
          <td class="px-3 py-3 font-sans text-sm text-text-primary">
            {{ row.document.fileNumber || '-' }}
          </td>
          <td class="px-3 py-3 font-sans text-sm text-text-secondary">
            {{ row.document.documentTypeName ?? '-' }}
          </td>
          <td class="px-3 py-3 font-sans text-sm text-text-secondary">
            {{ t(`students.fileStatus.${row.document.fileStatus}`) }}
          </td>
          <td class="px-3 py-3">
            <PipelineStatusChip
              v-if="row.snapshot"
              :status="row.snapshot.status"
              :label="row.snapshot.statusLabel"
            />
            <span v-else class="font-sans text-xs text-text-muted">
              {{ snapshotsLoading ? t('students.states.loading') : '—' }}
            </span>
          </td>
          <td class="px-3 py-3">
            <div v-if="row.confidence !== null" class="flex items-center gap-2">
              <div class="h-1.5 w-16 overflow-hidden rounded-full bg-surface-input">
                <div
                  class="h-full rounded-full"
                  :class="confidenceTone(row.confidence)"
                  :style="{ width: `${row.confidence}%` }"
                />
              </div>
              <span class="font-sans text-xs text-text-secondary">{{ row.confidence }}%</span>
            </div>
            <span v-else class="font-sans text-xs text-text-muted">—</span>
          </td>
          <td class="px-3 py-3 font-sans text-sm text-text-secondary">
            {{ formatDate(row.document.submittedAt ?? row.document.createdAt) }}
          </td>
          <td class="px-3 py-3 text-end">
            <RouterLink
              :to="`/student-documents/${row.document.id}`"
              class="inline-flex items-center gap-1 font-sans text-xs text-primary hover:underline"
            >
              {{ t('students.documents.open') }}
              <ExternalLink class="h-3 w-3" />
            </RouterLink>
          </td>
        </tr>
      </template>
    </DataTable>
  </section>
</template>
