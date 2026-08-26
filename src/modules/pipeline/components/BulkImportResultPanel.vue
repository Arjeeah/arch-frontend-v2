<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { Activity, CircleCheck, TriangleAlert, X } from 'lucide-vue-next'
import { formatCount } from '../format'
import type { BulkImportResult } from '../types'

const props = defineProps<{
  result: BulkImportResult
  /** Where the monitor lives, so the panel can hand the operator straight over. */
  monitorPath: string
}>()

const emit = defineEmits<{ dismiss: [] }>()

const { t, locale } = useI18n()

const showIds = ref(false)

/**
 * The server queued fewer documents than were sent, so part of the batch never
 * arrived. The panel drops its success colours for this — an operator scanning
 * the screen should not read a truncated import as a clean one.
 */
const isPartial = computed(() => props.result.documentsQueued < props.result.submittedCount)
</script>

<template>
  <section
    class="rounded-[10px] border p-5"
    :class="isPartial ? 'border-warning/40 bg-warning/10' : 'border-success/30 bg-success-bg'"
    role="status"
    aria-live="polite"
  >
    <div class="flex items-start gap-3">
      <component
        :is="isPartial ? TriangleAlert : CircleCheck"
        class="mt-0.5 h-5 w-5 shrink-0"
        :class="isPartial ? 'text-warning' : 'text-success'"
      />

      <div class="min-w-0 flex-1">
        <h2 class="font-display text-sm font-semibold text-text-primary">
          {{
            t('pipeline.upload.queuedTitle', { count: formatCount(result.documentsQueued, locale) })
          }}
        </h2>
        <p class="mt-1 font-sans text-xs text-text-secondary">
          {{ t('pipeline.upload.queuedBody') }}
        </p>

        <p v-if="isPartial" class="mt-2 font-sans text-xs font-medium text-danger">
          {{
            t('pipeline.upload.partialWarning', {
              queued: formatCount(result.documentsQueued, locale),
              submitted: formatCount(result.submittedCount, locale),
            })
          }}
        </p>

        <div class="mt-3 flex flex-wrap items-center gap-3">
          <RouterLink
            :to="monitorPath"
            class="inline-flex items-center gap-2 rounded bg-primary-mid px-3 py-1.5 font-sans text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <Activity class="h-4 w-4" />
            {{ t('pipeline.upload.openMonitor') }}
          </RouterLink>

          <button
            v-if="result.documentIds.length"
            type="button"
            class="font-sans text-xs text-primary underline underline-offset-2"
            @click="showIds = !showIds"
          >
            {{ showIds ? t('pipeline.upload.hideIds') : t('pipeline.upload.showIds') }}
          </button>
        </div>

        <!-- The ids are the only handle on documents that have no file number
             yet, so they are worth keeping reachable — just not by default. -->
        <ul
          v-if="showIds"
          class="mt-3 max-h-40 overflow-y-auto rounded border border-border bg-white p-2"
        >
          <li
            v-for="id in result.documentIds"
            :key="id"
            class="px-1 py-0.5 font-mono text-[11px] text-text-secondary"
          >
            {{ id }}
          </li>
        </ul>
      </div>

      <button
        type="button"
        class="shrink-0 rounded p-1 text-text-secondary transition-colors hover:bg-white/60"
        :aria-label="t('pipeline.upload.dismissResult')"
        @click="emit('dismiss')"
      >
        <X class="h-4 w-4" />
      </button>
    </div>
  </section>
</template>
