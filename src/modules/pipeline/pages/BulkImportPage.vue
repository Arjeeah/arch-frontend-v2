<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { Activity, Upload } from 'lucide-vue-next'
import AppFileUpload from '@/shared/components/AppFileUpload.vue'
import AppButton from '@/shared/components/AppButton.vue'
import AppConfirmDialog from '@/shared/components/AppConfirmDialog.vue'
import { useToasts } from '@/shared/composables/useToasts'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import {
  BULK_IMPORT_ACCEPT,
  BULK_IMPORT_MAX_FILES,
  BULK_IMPORT_MAX_SIZE_MB,
  BulkImportTruncatedError,
  pipelineApi,
} from '../api/pipelineApi'
import { formatBytes, formatCount } from '../format'
import type { BulkImportResult } from '../types'
import BulkImportResultPanel from '../components/BulkImportResultPanel.vue'

/** Kept in step with the route the integrator adds — see WIRING.md. */
const MONITOR_PATH = '/pipeline/monitor'

const { t, locale } = useI18n()
const toasts = useToasts()

const files = ref<File[]>([])
const uploading = ref(false)
const progress = ref(0)
const result = ref<BulkImportResult | null>(null)
const confirmClear = ref(false)

let controller: AbortController | null = null

const totalBytes = computed(() => files.value.reduce((sum, file) => sum + file.size, 0))
const canSubmit = computed(
  () => !uploading.value && files.value.length > 0 && files.value.length <= BULK_IMPORT_MAX_FILES,
)

/** Backend rules restated for the operator, from `BulkImportRequest::rules()`. */
const rules = computed(() => [
  t('pipeline.upload.ruleTypes'),
  t('pipeline.upload.ruleSize', { size: BULK_IMPORT_MAX_SIZE_MB }),
  t('pipeline.upload.ruleCount', { max: formatCount(BULK_IMPORT_MAX_FILES, locale.value) }),
])

/**
 * The same limits again, condensed for inside the drop zone. Interpolated
 * rather than spelled out in the locale files so the two constants stay the
 * single source of the numbers — a translation that hard-codes "20 MB" goes
 * stale silently the day the backend rule changes.
 */
const dropHint = computed(() =>
  t('pipeline.upload.dropHint', {
    size: BULK_IMPORT_MAX_SIZE_MB,
    max: formatCount(BULK_IMPORT_MAX_FILES, locale.value),
  }),
)

/**
 * `AppFileUpload` already lists every rejection under the drop zone, so the
 * toast only says how many were turned away — repeating each reason twice on
 * a 500-file drop would bury the screen.
 */
function onRejected(messages: string[]): void {
  toasts.error(t('pipeline.upload.rejected', { count: messages.length }))
}

async function submit(): Promise<void> {
  if (!canSubmit.value) return

  uploading.value = true
  progress.value = 0
  result.value = null
  controller = new AbortController()

  try {
    const queued = await pipelineApi.bulkImport(files.value, {
      signal: controller.signal,
      onProgress: (percent) => {
        progress.value = percent
      },
    })

    result.value = queued
    files.value = []

    // A short tally means PHP threw files away before Laravel ever saw them
    // (`max_file_uploads` / `post_max_size`). The request still succeeded, so
    // nothing else would tell the operator that part of the batch is missing —
    // this toast stays up until it is dismissed.
    if (queued.truncation && !queued.truncation.confirmed) {
      // The batch landed exactly on the server's per-request cap, so it is
      // indistinguishable from a truncated one. The files went in; say so, and
      // say why the count cannot be trusted. Stays up until dismissed.
      toasts.error(
        t('pipeline.upload.suspectedTruncationToast', {
          queued: formatCount(queued.documentsQueued, locale.value),
          max: formatCount(queued.truncation.maxFileUploads, locale.value),
        }),
        0,
      )
    } else if (queued.documentsQueued < queued.submittedCount) {
      toasts.error(
        t('pipeline.upload.partialToast', {
          queued: formatCount(queued.documentsQueued, locale.value),
          submitted: formatCount(queued.submittedCount, locale.value),
        }),
        0,
      )
    } else {
      toasts.success(
        // The named `count` is the thousands-separated display string; the
        // trailing argument is the real number vue-i18n needs to pick the
        // right plural form (`t(key, named, pluralChoice)`) — a formatted
        // string in `named.count` isn't recognised as a number and always
        // resolves to the same form regardless of value.
        t(
          'pipeline.upload.successToast',
          { count: formatCount(queued.documentsQueued, locale.value) },
          queued.documentsQueued,
        ),
      )
    }
  } catch (err: unknown) {
    // An operator-initiated cancel is not a failure to report as one.
    if (controller?.signal.aborted) {
      toasts.info(t('pipeline.upload.cancelled'))
    } else if (err instanceof BulkImportTruncatedError) {
      // The server proved the batch was cut short before it arrived and
      // imported nothing, so the selection is kept — the operator can re-send
      // it in smaller batches without picking every file again. Four
      // independent counts, so the message cannot be pluralised (see CLAUDE.md).
      const { receivedFileCount, declaredFileCount, discardedFileCount, maxFileUploads } =
        err.truncation
      toasts.error(
        t('pipeline.upload.truncatedToast', {
          received: formatCount(receivedFileCount, locale.value),
          declared: formatCount(declaredFileCount ?? files.value.length, locale.value),
          discarded: formatCount(discardedFileCount ?? 0, locale.value),
          max: formatCount(maxFileUploads, locale.value),
        }),
        0,
      )
    } else {
      toasts.error(getApiErrorMessage(err, t('pipeline.upload.errorToast')))
    }
  } finally {
    uploading.value = false
    progress.value = 0
    controller = null
  }
}

function cancelUpload(): void {
  controller?.abort()
}

function clearSelection(): void {
  files.value = []
  confirmClear.value = false
}
</script>

<template>
  <div class="flex flex-col gap-6 pb-10">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="font-display text-2xl font-semibold text-text-primary">
          {{ t('pipeline.upload.title') }}
        </h1>
        <p class="mt-1 font-sans text-sm text-text-secondary">
          {{ t('pipeline.upload.subtitle') }}
        </p>
      </div>

      <RouterLink
        :to="MONITOR_PATH"
        class="inline-flex items-center gap-2 rounded border border-border px-3 py-1.5 font-sans text-sm font-medium text-text-secondary transition-colors hover:bg-surface"
      >
        <Activity class="h-4 w-4" />
        {{ t('pipeline.upload.openMonitor') }}
      </RouterLink>
    </header>

    <BulkImportResultPanel
      v-if="result"
      :result="result"
      :monitor-path="MONITOR_PATH"
      @dismiss="result = null"
    />

    <section class="rounded-[10px] border border-border bg-white p-6 shadow-sm">
      <h2 class="font-display text-sm font-semibold text-text-primary">
        {{ t('pipeline.upload.dropTitle') }}
      </h2>
      <ul class="mt-2 flex flex-col gap-1">
        <li v-for="rule in rules" :key="rule" class="font-sans text-xs text-text-secondary">
          • {{ rule }}
        </li>
      </ul>

      <div class="mt-4">
        <AppFileUpload
          v-model:files="files"
          :accept="BULK_IMPORT_ACCEPT"
          :max-size-mb="BULK_IMPORT_MAX_SIZE_MB"
          :max-files="BULK_IMPORT_MAX_FILES"
          :disabled="uploading"
          multiple
          :label="t('pipeline.upload.dropLabel')"
          :browse-label="t('pipeline.upload.browse')"
          :hint="dropHint"
          :remove-label="t('pipeline.upload.removeFile')"
          @error="onRejected"
        />
      </div>

      <!-- One multipart request carries the whole batch, so the only honest
           measure is how much of that request has gone up. Per-file bars would
           imply progress the browser never reports. -->
      <div v-if="uploading" class="mt-4">
        <div class="flex items-center justify-between font-sans text-xs text-text-secondary">
          <span>{{ t('pipeline.upload.uploading') }}</span>
          <span class="tabular-nums">{{ progress }}%</span>
        </div>
        <div
          class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-input"
          role="progressbar"
          :aria-valuenow="progress"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div
            class="h-full rounded-full bg-primary transition-[width] duration-200"
            :style="{ width: `${progress}%` }"
          />
        </div>
      </div>

      <div
        class="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"
      >
        <p class="font-sans text-xs text-text-secondary">
          {{
            t(
              'pipeline.upload.selectionSummary',
              { count: formatCount(files.length, locale), size: formatBytes(totalBytes, locale) },
              files.length,
            )
          }}
        </p>

        <div class="flex items-center gap-2">
          <AppButton v-if="uploading" variant="ghost" size="md" @click="cancelUpload">
            {{ t('pipeline.upload.cancel') }}
          </AppButton>
          <AppButton
            v-else
            variant="ghost"
            size="md"
            :disabled="files.length === 0"
            @click="confirmClear = true"
          >
            {{ t('pipeline.upload.clear') }}
          </AppButton>

          <AppButton
            variant="primary"
            size="md"
            :disabled="!canSubmit"
            :loading="uploading"
            @click="submit"
          >
            <Upload v-if="!uploading" class="h-4 w-4" />
            {{ t('pipeline.upload.submit') }}
          </AppButton>
        </div>
      </div>
    </section>

    <AppConfirmDialog
      :open="confirmClear"
      :title="t('pipeline.upload.clearConfirmTitle')"
      :message="
        t(
          'pipeline.upload.clearConfirmBody',
          { count: formatCount(files.length, locale) },
          files.length,
        )
      "
      :confirm-label="t('pipeline.upload.clear')"
      confirm-class="bg-danger text-white hover:opacity-80"
      @close="confirmClear = false"
      @confirm="clearSelection"
    />
  </div>
</template>
