<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileText } from 'lucide-vue-next'
import SimilarityBar from './SimilarityBar.vue'
import { highlightParts } from '../utils/highlight'
import type { SearchMode, SearchResult } from '../types'

/** One matching page: its page badge, the snippet, and how well it scored. */
const props = defineProps<{
  result: SearchResult
  mode: SearchMode
  /** Best score in the whole result set — see `SimilarityBar`. */
  maxScore: number
  /** The submitted query, used to mark matching runs in the snippet. */
  query: string
}>()

const { t } = useI18n()

const parts = computed(() => highlightParts(props.result.content, props.query))

const pageLabel = computed(() =>
  props.result.pageNumber === null
    ? t('search.results.pageUnknown')
    : t('search.results.page', { page: props.result.pageNumber }),
)
</script>

<template>
  <li class="flex flex-col gap-2 rounded-lg border border-border bg-surface-card p-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <span
        class="inline-flex items-center gap-1.5 rounded-full bg-surface px-2 py-0.5 font-sans text-xs font-medium text-text-secondary"
      >
        <FileText class="h-3.5 w-3.5" />
        {{ pageLabel }}
      </span>
      <SimilarityBar
        :score="props.result.similarityScore"
        :mode="props.mode"
        :max-score="props.maxScore"
      />
    </div>

    <!-- OCR text: `dir="auto"` so an Arabic page and a Latin one each read the
         right way round regardless of the UI locale. -->
    <p class="whitespace-pre-line font-sans text-sm leading-6 text-text-primary" dir="auto">
      <template v-for="(part, index) in parts" :key="index"
        ><span v-if="part.match" class="rounded bg-highlight px-0.5">{{ part.text }}</span
        ><template v-else>{{ part.text }}</template></template
      >
    </p>
  </li>
</template>
