<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ExternalLink, FileQuestion } from 'lucide-vue-next'
import AppEmptyState from '@/shared/components/AppEmptyState.vue'
import type { ReviewQueueItem } from '../types'

const props = defineProps<{ item: ReviewQueueItem | null }>()

const { t } = useI18n()

/**
 * Bulk import accepts pdf/png/jpg/jpeg/tiff, so the pane has to serve both.
 * An `<img>` for a raster scan beats an iframe: browsers render a bare image
 * in an iframe at native size with no fit-to-width.
 */
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'tif', 'tiff', 'webp', 'gif']

const extension = computed(() => {
  const source = props.item?.fileName ?? props.item?.fileUrl ?? ''
  const match = /\.([a-z0-9]+)(?:[?#].*)?$/i.exec(source)
  return match?.[1]?.toLowerCase() ?? ''
})

const isImage = computed(() => IMAGE_EXTENSIONS.includes(extension.value))

const caption = computed(() => props.item?.fileName || props.item?.fileNumber || '')
</script>

<template>
  <section
    class="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-surface-card"
    :aria-label="t('review.preview.title')"
  >
    <header class="flex items-center gap-2 border-b border-border px-4 py-2.5">
      <h2 class="min-w-0 flex-1 truncate font-display text-sm font-semibold text-text-primary">
        {{ caption || t('review.preview.title') }}
      </h2>
      <a
        v-if="item?.fileUrl"
        :href="item.fileUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 font-sans text-xs text-primary hover:bg-surface"
      >
        <ExternalLink class="h-3.5 w-3.5" />
        {{ t('review.preview.openInNewTab') }}
      </a>
    </header>

    <div class="min-h-[420px] flex-1 bg-surface">
      <!--
        `file_url` is the Spatie media URL on the API host.
        // verify against live API: it is assumed to be publicly readable — an
        iframe/img cannot attach the bearer token, so a signed or
        auth-protected media route would render an empty pane here.
      -->
      <img
        v-if="item?.fileUrl && isImage"
        :src="item.fileUrl"
        :alt="caption || t('review.preview.title')"
        class="h-full w-full object-contain"
      />
      <iframe
        v-else-if="item?.fileUrl"
        :src="item.fileUrl"
        :title="caption || t('review.preview.title')"
        class="h-full min-h-[420px] w-full border-0"
      />
      <AppEmptyState
        v-else
        :icon="FileQuestion"
        :title="t('review.preview.emptyTitle')"
        :description="item ? t('review.preview.noFile') : t('review.preview.selectRow')"
      />
    </div>
  </section>
</template>
