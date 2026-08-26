<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Loader2, Trash2 } from 'lucide-vue-next'
import AppButton from '@/shared/components/AppButton.vue'
import AppConfirmDialog from '@/shared/components/AppConfirmDialog.vue'
import AppSelect from '@/shared/components/AppSelect.vue'
import FormField from '@/shared/components/FormField.vue'
import { useToasts } from '@/shared/composables/useToasts'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import ImportTemplateCard from '../components/ImportTemplateCard.vue'
import ImportUploadCard from '../components/ImportUploadCard.vue'
import ImportJobsTable from '../components/ImportJobsTable.vue'
import ImportErrorsTable from '../components/ImportErrorsTable.vue'
import { useImportsStore } from '../stores/useImportsStore'
import { importsApi } from '../api/importsApi'
import { saveBlob } from '@/shared/utils/saveBlob'
import { IMPORT_ENTITIES } from '../types'
import type { ImportEntity } from '../types'

const { t } = useI18n()
const toasts = useToasts()
const store = useImportsStore()

const entity = ref<ImportEntity>('faculties')
const files = ref<File[]>([])
const downloadingTemplate = ref(false)
const downloadingErrorsId = ref<string | null>(null)
const confirmClearOpen = ref(false)

const entityOptions = computed(() =>
  IMPORT_ENTITIES.map((value) => ({ value, label: t(`imports.entities.${value}`) })),
)

onMounted(() => {
  // Signing in and out are router navigations, so this store can outlive a user
  // switch — re-read the history for whoever is signed in *now* first.
  store.hydrate()
  // A job may have finished while the tab was closed — settle the list next,
  // then let the interval keep the still-running ones fresh.
  void store.pollActiveJobs()
  store.startPolling()
})

onBeforeUnmount(() => store.stopPolling())

function onEntityChange(value: string): void {
  const next = IMPORT_ENTITIES.find((candidate) => candidate === value)
  if (next) entity.value = next
}

async function handleTemplateDownload(): Promise<void> {
  downloadingTemplate.value = true
  try {
    const file = await importsApi.downloadTemplate(entity.value)
    saveBlob(file.blob, file.fileName)
    toasts.success(t('imports.toasts.templateDownloaded'))
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('imports.toasts.templateFailed')))
  } finally {
    downloadingTemplate.value = false
  }
}

async function handleUpload(file: File): Promise<void> {
  try {
    await store.upload(entity.value, file)
    files.value = []
    toasts.success(t('imports.toasts.queued'))
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('imports.toasts.uploadFailed')))
  }
}

function handleReject(messages: string[]): void {
  const first = messages[0]
  if (first) toasts.error(first)
}

async function handleViewErrors(jobId: string): Promise<void> {
  await store.fetchErrorRows(jobId)
}

async function handleDownloadErrors(jobId: string): Promise<void> {
  downloadingErrorsId.value = jobId
  try {
    const file = await importsApi.downloadErrors(jobId)
    saveBlob(file.blob, file.fileName)
    toasts.success(t('imports.toasts.errorsDownloaded'))
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('imports.toasts.errorsFailed')))
  } finally {
    downloadingErrorsId.value = null
  }
}

/** Re-reads the failed rows of whichever job the panel is showing. */
function reloadOpenErrors(): void {
  const jobId = store.errorRowsJobId
  if (jobId) void store.fetchErrorRows(jobId)
}

function downloadOpenErrors(): void {
  const jobId = store.errorRowsJobId
  if (jobId) void handleDownloadErrors(jobId)
}

/** Explicit user action, so a failed poll is reported rather than swallowed. */
async function handleRefresh(jobId: string): Promise<void> {
  try {
    await store.refreshJob(jobId, { throwOnError: true })
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('imports.toasts.refreshFailed')))
  }
}

/**
 * `removeJob` filters the row out and persists immediately — irreversible, and
 * the sibling "clear history" action on this page already confirms.
 */
const pendingRemoveId = ref<string | null>(null)

function handleRemove(jobId: string): void {
  pendingRemoveId.value = jobId
}

function confirmRemove(): void {
  const jobId = pendingRemoveId.value
  if (!jobId) return
  store.removeJob(jobId)
  pendingRemoveId.value = null
  toasts.info(t('imports.toasts.jobRemoved'))
}

function confirmClear(): void {
  store.clearJobs()
  confirmClearOpen.value = false
  toasts.info(t('imports.toasts.historyCleared'))
}
</script>

<template>
  <div class="flex flex-col gap-8 pb-10">
    <header class="flex flex-col gap-1">
      <h1 class="font-display text-2xl font-semibold text-text-primary">
        {{ t('imports.title') }}
      </h1>
      <p class="text-sm text-text-secondary font-sans">{{ t('imports.subtitle') }}</p>
    </header>

    <section class="flex flex-col gap-4">
      <div class="max-w-sm">
        <FormField :label="t('imports.entityLabel')" field-id="import-entity">
          <AppSelect
            :model-value="entity"
            :options="entityOptions"
            @update:model-value="onEntityChange"
          />
        </FormField>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ImportTemplateCard
          :entity="entity"
          :downloading="downloadingTemplate"
          @download="handleTemplateDownload"
        />
        <ImportUploadCard
          :files="files"
          :uploading="store.uploading"
          :progress="store.uploadProgress"
          @update:files="files = $event"
          @upload="handleUpload"
          @reject="handleReject"
        />
      </div>
    </section>

    <section class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <h2 class="font-display text-lg font-semibold text-text-primary">
            {{ t('imports.jobs.title') }}
          </h2>
          <span
            v-if="store.hasActiveJobs"
            class="inline-flex items-center gap-1 rounded-full bg-highlight/60 px-2 py-0.5 text-xs font-sans text-primary-dark"
          >
            <Loader2 class="h-3 w-3 animate-spin" />
            {{ t('imports.jobs.polling', { count: store.activeJobs.length }) }}
          </span>
        </div>

        <AppButton
          v-if="store.jobs.length"
          variant="ghost"
          size="sm"
          @click="confirmClearOpen = true"
        >
          <Trash2 class="h-4 w-4" />
          {{ t('imports.actions.clearHistory') }}
        </AppButton>
      </div>

      <p class="text-xs text-text-secondary font-sans">{{ t('imports.jobs.localNote') }}</p>

      <ImportJobsTable
        :jobs="store.jobs"
        :open-errors-job-id="store.errorRowsJobId"
        :downloading-errors-id="downloadingErrorsId"
        @view-errors="handleViewErrors"
        @download-errors="handleDownloadErrors"
        @refresh="handleRefresh"
        @remove="handleRemove"
      />
    </section>

    <ImportErrorsTable
      v-if="store.errorRowsJobId"
      :rows="store.errorRows"
      :loading="store.errorRowsLoading"
      :error="store.errorRowsError"
      :downloading="downloadingErrorsId === store.errorRowsJobId"
      @retry="reloadOpenErrors"
      @download="downloadOpenErrors"
      @close="store.clearErrorRows()"
    />

    <AppConfirmDialog
      :open="pendingRemoveId !== null"
      :title="t('imports.confirmRemove.title')"
      :message="t('imports.confirmRemove.message')"
      :confirm-label="t('imports.confirmRemove.confirm')"
      confirm-class="bg-danger text-white hover:opacity-80"
      @close="pendingRemoveId = null"
      @confirm="confirmRemove"
    />

    <AppConfirmDialog
      :open="confirmClearOpen"
      :title="t('imports.confirmClear.title')"
      :message="t('imports.confirmClear.message')"
      :confirm-label="t('imports.confirmClear.confirm')"
      confirm-class="bg-danger text-white hover:opacity-80"
      @close="confirmClearOpen = false"
      @confirm="confirmClear"
    />
  </div>
</template>
