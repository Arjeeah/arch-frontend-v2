<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Sparkles, TriangleAlert } from 'lucide-vue-next'
import type { SearchMode } from '../types'

/**
 * Says which engine answered — the single most important operational signal on
 * this screen. `keyword` means `HybridSearchService` caught an exception from
 * the semantic search and fell back to a `tsvector` match: results are still
 * shown, but recall collapses, so the badge shouts rather than whispers and
 * exposes the exception message the backend passed along.
 */
const props = defineProps<{
  mode: SearchMode
  /** Exception message behind a keyword fallback; null in semantic mode. */
  fallbackReason: string | null
}>()

const { t } = useI18n()

const reasonOpen = ref(false)
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex flex-wrap items-center gap-2">
      <span
        v-if="props.mode === 'semantic'"
        class="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-1 font-sans text-xs font-medium text-success-text"
        :title="t('search.mode.semanticHint')"
      >
        <Sparkles class="h-3.5 w-3.5" />
        {{ t('search.mode.semantic') }}
      </span>

      <template v-else>
        <span
          class="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/20 px-2.5 py-1 font-sans text-xs font-semibold text-text-primary"
          :title="props.fallbackReason ?? t('search.mode.keywordHint')"
        >
          <TriangleAlert class="h-3.5 w-3.5 text-warning" />
          {{ t('search.mode.keyword') }}
        </span>
        <span class="font-sans text-xs text-text-secondary">
          {{ t('search.mode.keywordHint') }}
        </span>
        <button
          v-if="props.fallbackReason"
          type="button"
          class="font-sans text-xs font-medium text-primary underline underline-offset-2 hover:opacity-80"
          @click="reasonOpen = !reasonOpen"
        >
          {{ reasonOpen ? t('search.mode.hideReason') : t('search.mode.whyLabel') }}
        </button>
      </template>
    </div>

    <!-- Tap targets beat tooltips on touch, so the reason is expandable too. -->
    <div
      v-if="reasonOpen && props.fallbackReason"
      class="rounded-lg border border-warning/40 bg-warning/10 p-3"
    >
      <p class="font-display text-xs font-semibold text-text-primary">
        {{ t('search.mode.reasonLabel') }}
      </p>
      <p class="mt-1 break-words font-sans text-xs text-text-secondary" dir="ltr">
        {{ props.fallbackReason }}
      </p>
    </div>
  </div>
</template>
