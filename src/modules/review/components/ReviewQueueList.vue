<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { CheckCircle2, FileText } from 'lucide-vue-next'
import { relativeTime } from '@/shared/utils/date'
import ConfidenceMeter from './ConfidenceMeter.vue'
import type { ReviewQueueItem } from '../types'

defineProps<{
  items: ReviewQueueItem[]
  selectedId: string | null
  loading: boolean
}>()

const emit = defineEmits<{ select: [documentId: string] }>()

const { t, locale } = useI18n()

/** Rows arrive worst-confidence-first; the operator works top to bottom. */
function primaryLabel(item: ReviewQueueItem): string {
  return (
    item.structuredData?.studentName ||
    item.structuredData?.studentNumber ||
    item.fileName ||
    t('review.list.untitled')
  )
}
</script>

<template>
  <div class="flex flex-col">
    <!-- Loading skeleton: same row rhythm as the real list, so nothing jumps. -->
    <div v-if="loading" class="flex flex-col gap-px" aria-hidden="true">
      <div v-for="n in 6" :key="n" class="flex flex-col gap-2 px-4 py-3">
        <div class="h-3 w-2/3 animate-pulse rounded bg-surface-input" />
        <div class="h-2 w-1/3 animate-pulse rounded bg-surface-input" />
      </div>
    </div>

    <ul v-else class="flex flex-col" role="listbox" :aria-label="t('review.list.title')">
      <!-- `presentation` keeps the listbox owning the options directly: an
           `li` with its own implicit role between them breaks the mapping. -->
      <li v-for="item in items" :key="item.documentId" role="presentation">
        <button
          type="button"
          role="option"
          :aria-selected="item.documentId === selectedId"
          class="flex w-full flex-col gap-1.5 border-b border-border px-4 py-3 text-start transition-colors hover:bg-surface"
          :class="
            item.documentId === selectedId
              ? 'bg-highlight/40 border-s-[3px] border-s-primary ps-[13px]'
              : 'border-s-[3px] border-s-transparent ps-[13px]'
          "
          @click="emit('select', item.documentId)"
        >
          <div class="flex items-center gap-2">
            <FileText class="h-4 w-4 shrink-0 text-text-muted" />
            <span
              class="min-w-0 flex-1 truncate font-display text-sm font-medium text-text-primary"
            >
              {{ primaryLabel(item) }}
            </span>
            <CheckCircle2 v-if="item.verifiedAt" class="h-4 w-4 shrink-0 text-success" />
            <ConfidenceMeter v-else :score="item.confidenceScore" variant="chip" />
          </div>

          <div class="flex items-center gap-2 ps-6 font-sans text-xs text-text-secondary">
            <span v-if="item.fileNumber" class="truncate">{{ item.fileNumber }}</span>
            <span v-if="item.fileNumber && item.createdAt" aria-hidden="true">·</span>
            <span v-if="item.createdAt" class="shrink-0">
              {{ relativeTime(item.createdAt, locale) }}
            </span>
          </div>
        </button>
      </li>
    </ul>
  </div>
</template>
