<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Layers, TriangleAlert } from 'lucide-vue-next'
import DataTable from '@/shared/components/DataTable.vue'
import AppEmptyState from '@/shared/components/AppEmptyState.vue'
import type { DocumentSegment } from '../types'

const props = defineProps<{
  segments: DocumentSegment[]
  loading?: boolean
  /**
   * The segments endpoint is an AI-console surface, not part of the document
   * contract — a failure means "no segment view", never a broken page.
   */
  unavailable?: boolean
}>()

const { t, locale } = useI18n()

const columns = computed(() => [
  { key: 'sequence', label: t('studentDocuments.segments.columns.sequence') },
  { key: 'pages', label: t('studentDocuments.segments.columns.pages') },
  { key: 'detected', label: t('studentDocuments.segments.columns.detected') },
  { key: 'matched', label: t('studentDocuments.segments.columns.matched') },
  { key: 'confidence', label: t('studentDocuments.segments.columns.confidence') },
])

/**
 * Already a percentage on a 0–100 scale: `SegmentDocumentBundle` writes
 * `confidence_score` from `AiRefiner::refineWith()`, which returns a
 * `RefinementData`, and `RefinementData::fromArray` does the 0.0–1.0 → 0–100
 * rescale before the DTO is built.
 *
 * The old `<= 1` "guard" re-applied that rescale to the one band it must not:
 * a genuine 0.5% score came out as 50%. Clamp only, matching `formatConfidence`
 * and `ConfidenceMeter`.
 */
function percent(score: number | null): number | null {
  if (score === null) return null
  return Math.max(0, Math.min(100, Math.round(score)))
}

function pageRange(segment: DocumentSegment): string {
  if (segment.pageStart === null && segment.pageEnd === null) return '—'
  if (segment.pageEnd === null || segment.pageStart === segment.pageEnd)
    return String(segment.pageStart ?? segment.pageEnd)
  return `${segment.pageStart}–${segment.pageEnd}`
}

/** Arabic readers get the segmenter's own Arabic label where it produced one. */
function detectedLabel(segment: DocumentSegment): string {
  if (locale.value.startsWith('ar') && segment.detectedTypeAr) return segment.detectedTypeAr
  return segment.detectedType || segment.detectedTypeAr || '—'
}

const rows = computed(() =>
  props.segments.map((segment) => ({
    segment,
    pages: pageRange(segment),
    detected: detectedLabel(segment),
    confidence: percent(segment.confidence),
  })),
)
</script>

<template>
  <section class="rounded-[10px] border border-border bg-surface-card shadow-sm">
    <header
      class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"
    >
      <div class="flex items-center gap-2">
        <Layers class="h-4 w-4 text-primary" />
        <h2 class="font-display text-base font-semibold text-text-primary">
          {{ t('studentDocuments.segments.title') }}
        </h2>
      </div>
      <p class="font-sans text-xs text-text-secondary">
        {{ t('studentDocuments.segments.count', { count: segments.length }) }}
      </p>
    </header>

    <p
      v-if="loading && segments.length === 0"
      class="px-5 py-4 font-sans text-sm text-text-secondary"
    >
      {{ t('studentDocuments.states.loading') }}
    </p>

    <p v-else-if="unavailable" class="px-5 py-4 font-sans text-sm text-text-secondary">
      {{ t('studentDocuments.segments.unavailable') }}
    </p>

    <AppEmptyState
      v-else-if="segments.length === 0"
      compact
      :icon="Layers"
      :title="t('studentDocuments.segments.emptyTitle')"
      :description="t('studentDocuments.segments.emptyDescription')"
    />

    <DataTable v-else :columns="columns">
      <template #rows>
        <template v-for="row in rows" :key="row.segment.sequence">
          <tr class="border-t border-border hover:bg-surface">
            <td class="px-3 py-3 font-sans text-sm text-text-primary">
              {{ row.segment.sequence }}
            </td>
            <td class="px-3 py-3 font-sans text-sm text-text-secondary">{{ row.pages }}</td>
            <td class="px-3 py-3 font-sans text-sm text-text-primary">{{ row.detected }}</td>
            <td class="px-3 py-3 font-sans text-sm text-text-secondary">
              {{ row.segment.matchedType ?? t('studentDocuments.segments.unmatched') }}
            </td>
            <td class="px-3 py-3 font-sans text-sm text-text-secondary">
              {{ row.confidence !== null ? `${row.confidence}%` : '—' }}
            </td>
          </tr>
          <tr v-if="row.segment.error" class="border-t border-border bg-danger/5">
            <td colspan="5" class="px-3 py-2">
              <p class="flex items-start gap-2 font-sans text-xs text-danger">
                <TriangleAlert class="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span class="whitespace-pre-wrap break-words">{{ row.segment.error }}</span>
              </p>
            </td>
          </tr>
        </template>
      </template>
    </DataTable>
  </section>
</template>
