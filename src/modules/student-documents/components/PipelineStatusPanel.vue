<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { BadgeCheck, TriangleAlert } from 'lucide-vue-next'
import { relativeTime } from '@/shared/utils/date'
import AppPipelineStatusChip from '@/shared/components/AppPipelineStatusChip.vue'
import type { PipelineStatusDetail } from '../types'

const props = defineProps<{
  snapshot: PipelineStatusDetail | null
  loading?: boolean
  /** True while the page is polling because the pipeline is still working. */
  polling?: boolean
}>()

const { t, locale } = useI18n()

/**
 * `confidence_score` is `decimal(5,2)` on a **0–100** scale — the rescale from
 * the model's 0.0–1.0 answer already happened in `RefinementData::fromArray()`.
 *
 * There used to be a `score > 1 ? score : score * 100` branch here "in case"
 * an un-rescaled value arrived. That band is exactly what the backend produces
 * from a *near-zero* model answer, so a document the extractor was 1% sure
 * about rendered as 100%, in the green band — while the pipeline monitor and
 * the review queue correctly read the same row as 1%. Clamp only.
 */
const confidencePercent = computed(() => {
  const score = props.snapshot?.confidenceScore
  if (score === null || score === undefined) return null
  return Math.max(0, Math.min(100, Math.round(score)))
})

const counters = computed(() => {
  const snapshot = props.snapshot
  if (!snapshot) return []
  return [
    { key: 'pages', label: t('studentDocuments.pipelinePanel.pages'), value: snapshot.pageCount },
    {
      key: 'ocr',
      label: t('studentDocuments.pipelinePanel.ocr'),
      value: snapshot.hasOcrContent
        ? t('studentDocuments.pipelinePanel.yes')
        : t('studentDocuments.pipelinePanel.no'),
    },
    {
      key: 'refinement',
      label: t('studentDocuments.pipelinePanel.refinement'),
      value: snapshot.hasRefinement
        ? t('studentDocuments.pipelinePanel.yes')
        : t('studentDocuments.pipelinePanel.no'),
    },
    {
      key: 'embeddings',
      label: t('studentDocuments.pipelinePanel.embeddedPages'),
      value: snapshot.embeddedPages,
    },
  ]
})

function confidenceTone(percent: number): string {
  if (percent >= 85) return 'bg-success'
  if (percent >= 60) return 'bg-warning'
  return 'bg-danger'
}
</script>

<template>
  <section class="rounded-[10px] border border-border bg-surface-card shadow-sm">
    <header
      class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"
    >
      <h2 class="font-display text-base font-semibold text-text-primary">
        {{ t('studentDocuments.pipelinePanel.title') }}
      </h2>
      <div class="flex items-center gap-2">
        <span v-if="polling" class="font-sans text-xs text-text-muted">
          {{ t('studentDocuments.pipelinePanel.autoRefresh') }}
        </span>
        <AppPipelineStatusChip
          v-if="snapshot"
          :status="snapshot.status"
          :api-label="snapshot.statusLabel"
          size="md"
        />
      </div>
    </header>

    <div class="px-5 py-4">
      <p v-if="loading && !snapshot" class="font-sans text-sm text-text-secondary">
        {{ t('studentDocuments.states.loading') }}
      </p>

      <p v-else-if="!snapshot" class="font-sans text-sm text-text-secondary">
        {{ t('studentDocuments.pipelinePanel.unavailable') }}
      </p>

      <div v-else class="flex flex-col gap-4">
        <!-- Failure detail -->
        <div
          v-if="snapshot.error"
          class="flex gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2"
        >
          <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <div class="min-w-0">
            <p class="font-display text-xs font-medium text-danger">
              {{ t('studentDocuments.pipelinePanel.errorTitle') }}
            </p>
            <p class="mt-0.5 whitespace-pre-wrap break-words font-sans text-xs text-text-secondary">
              {{ snapshot.error }}
            </p>
          </div>
        </div>

        <!-- Counters -->
        <dl class="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div v-for="counter in counters" :key="counter.key">
            <dt class="font-display text-xs text-text-muted">{{ counter.label }}</dt>
            <dd class="font-display text-lg font-semibold text-text-primary">
              {{ counter.value }}
            </dd>
          </div>
        </dl>

        <!-- Confidence -->
        <div v-if="confidencePercent !== null">
          <p class="mb-1 font-display text-xs text-text-muted">
            {{ t('studentDocuments.pipelinePanel.confidence') }}
          </p>
          <div class="flex items-center gap-3">
            <div class="h-2 w-40 overflow-hidden rounded-full bg-surface-input">
              <div
                class="h-full rounded-full"
                :class="confidenceTone(confidencePercent)"
                :style="{ width: `${confidencePercent}%` }"
              />
            </div>
            <span class="font-sans text-sm text-text-secondary">{{ confidencePercent }}%</span>
          </div>
        </div>

        <!-- Verification -->
        <p
          v-if="snapshot.isVerified"
          class="inline-flex w-fit items-center gap-2 rounded-full bg-success-bg px-3 py-1 font-sans text-xs text-success-text"
        >
          <BadgeCheck class="h-4 w-4" />
          {{
            t('studentDocuments.pipelinePanel.verifiedBy', {
              name: snapshot.verifiedBy ?? t('studentDocuments.pipelinePanel.unknownReviewer'),
              when: relativeTime(snapshot.verifiedAt, locale),
            })
          }}
        </p>
        <p v-else-if="snapshot.hasRefinement" class="font-sans text-xs text-text-secondary">
          {{ t('studentDocuments.pipelinePanel.awaitingReview') }}
        </p>
      </div>
    </div>
  </section>
</template>
