<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ExternalLink, FileQuestion } from 'lucide-vue-next'
import AppEmptyState from '@/shared/components/AppEmptyState.vue'
import type { ReviewQueueItem } from '../types'

const props = defineProps<{
  item: ReviewQueueItem | null
  /**
   * Signed, absolute media URL for `item`, resolved by the page through
   * `reviewApi.documentFileUrl()`. Null while it is still being resolved, when
   * the row has no file, or when the resolve failed.
   */
  fileUrl: string | null
  resolving?: boolean
  error?: string | null
}>()

const { t } = useI18n()

/**
 * Bulk import accepts pdf/png/jpg/jpeg/tiff, so the pane has to serve both.
 * An `<img>` for a raster scan beats an iframe: browsers render a bare image
 * in an iframe at native size with no fit-to-width.
 */
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'tif', 'tiff', 'webp', 'gif']

const extension = computed(() => {
  const source = props.item?.fileName ?? props.fileUrl ?? ''
  const match = /\.([a-z0-9]+)(?:[?#].*)?$/i.exec(source)
  return match?.[1]?.toLowerCase() ?? ''
})

const isImage = computed(() => IMAGE_EXTENSIONS.includes(extension.value))

const caption = computed(() => props.item?.fileName || props.item?.fileNumber || '')

/** Why the pane is empty, in the order the reasons actually apply. */
const emptyDescription = computed(() => {
  if (!props.item) return t('review.preview.selectRow')
  if (props.error) return props.error
  if (!props.item.hasFile) return t('review.preview.noFile')
  return t('review.preview.resolving')
})
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
        v-if="fileUrl"
        :href="fileUrl"
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
        `fileUrl` is a short-lived **signed** URL minted by
        `StudentDocumentResource` (`SignsMediaUrls`), not the queue row's own
        `file_url`. Verified against the live API: the media disk is private,
        the queue resource emits a relative unsigned `/storage/...` path, and
        fetching that path without a signature answers 403 — so an `<img>`/
        `<iframe>` pointed at it renders an empty pane. The signed URL carries
        its own authorisation in the query string, which is what makes a tag
        that cannot attach a bearer token work at all.
      -->
      <img
        v-if="fileUrl && isImage"
        :src="fileUrl"
        :alt="caption || t('review.preview.title')"
        class="h-full w-full object-contain"
      />
      <iframe
        v-else-if="fileUrl"
        :src="fileUrl"
        :title="caption || t('review.preview.title')"
        class="h-full min-h-[420px] w-full border-0"
      />
      <AppEmptyState
        v-else
        :icon="FileQuestion"
        :title="resolving ? t('review.preview.resolving') : t('review.preview.emptyTitle')"
        :description="emptyDescription"
      />
    </div>
  </section>
</template>
