<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Loader2, Trash2 } from 'lucide-vue-next'
import AppButton from '@/shared/components/AppButton.vue'
import AppConfirmDialog from '@/shared/components/AppConfirmDialog.vue'
import AppErrorState from '@/shared/components/AppErrorState.vue'
import { useToasts } from '@/shared/composables/useToasts'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import { authStorage } from '@/app/config/authStorage'
import ReportGenerateForm from '../components/ReportGenerateForm.vue'
import ReportJobsTable from '../components/ReportJobsTable.vue'
import WeeklyDigestCard from '../components/WeeklyDigestCard.vue'
import { useReportsStore } from '../stores/useReportsStore'
import { reportsApi } from '../api/reportsApi'
import { saveBlob } from '../utils/saveBlob'
import type { GenerateReportInput, ReportJob } from '../types'

const { t } = useI18n()
const toasts = useToasts()
const store = useReportsStore()

const downloadingId = ref<string | null>(null)
const confirmClearOpen = ref(false)

/**
 * `ReportController::weeklyDigest` answers 403 for faculty_staff, so the widget
 * is only mounted for the two roles the gate lets through — asking and showing
 * the error would be noise, not information.
 */
const canSeeDigest = computed(() => {
  const role = authStorage.getUser()?.role
  return role === 'super_admin' || role === 'archivist'
})

onMounted(() => {
  void store.fetchTypes()
  if (canSeeDigest.value) void store.fetchDigest()
  // Jobs restored from a previous visit may have finished while the tab was
  // closed; poll once immediately, then let the interval take over.
  void store.pollActiveJobs()
  store.startPolling()
})

onBeforeUnmount(() => store.stopPolling())

async function handleSubmit(input: GenerateReportInput): Promise<void> {
  try {
    await store.generate(input)
    toasts.success(t('reports.toasts.queued'))
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('reports.toasts.queueFailed')))
  }
}

async function handleDownload(job: ReportJob): Promise<void> {
  downloadingId.value = job.id
  try {
    const file = await reportsApi.downloadFile(job.id, job.fileName ?? `report-${job.id}`)
    saveBlob(file.blob, file.fileName)
    toasts.success(t('reports.toasts.downloaded'))
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('reports.toasts.downloadFailed')))
    // A 409/410 means the row the browser is holding is stale — re-read it so
    // the button state matches reality instead of failing again on next click.
    void store.refreshJob(job.id)
  } finally {
    downloadingId.value = null
  }
}

async function handleRefresh(jobId: string): Promise<void> {
  await store.refreshJob(jobId)
}

function handleRemove(jobId: string): void {
  store.removeJob(jobId)
}

function confirmClear(): void {
  store.clearJobs()
  confirmClearOpen.value = false
  toasts.info(t('reports.toasts.historyCleared'))
}
</script>

<template>
  <div class="flex flex-col gap-8 pb-10">
    <header class="flex flex-col gap-1">
      <h1 class="font-display text-2xl font-semibold text-text-primary">
        {{ t('reports.title') }}
      </h1>
      <p class="text-sm text-text-secondary font-sans">{{ t('reports.subtitle') }}</p>
    </header>

    <WeeklyDigestCard
      v-if="canSeeDigest"
      :digest="store.digest"
      :loading="store.digestLoading"
      :error="store.digestError"
      @retry="store.fetchDigest()"
    />

    <section class="flex flex-col gap-4">
      <h2 class="font-display text-lg font-semibold text-text-primary">
        {{ t('reports.generate.title') }}
      </h2>

      <div class="rounded-[10px] border border-border bg-surface-card p-5 shadow-sm">
        <div v-if="store.typesLoading" class="flex flex-col gap-4">
          <div class="h-[42px] animate-pulse rounded-[8px] bg-surface" />
          <div class="h-[42px] animate-pulse rounded-[8px] bg-surface" />
        </div>

        <AppErrorState
          v-else-if="store.typesError"
          compact
          :title="t('reports.errors.typesTitle')"
          :description="store.typesError"
          :retry-label="t('reports.actions.retry')"
          @retry="store.fetchTypes()"
        />

        <ReportGenerateForm
          v-else
          :types="store.types"
          :submitting="store.generating"
          @submit="handleSubmit"
        />
      </div>
    </section>

    <section class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <h2 class="font-display text-lg font-semibold text-text-primary">
            {{ t('reports.jobs.title') }}
          </h2>
          <span
            v-if="store.hasActiveJobs"
            class="inline-flex items-center gap-1 rounded-full bg-highlight/60 px-2 py-0.5 text-xs font-sans text-primary-dark"
          >
            <Loader2 class="h-3 w-3 animate-spin" />
            {{ t('reports.jobs.polling', { count: store.activeJobs.length }) }}
          </span>
        </div>

        <AppButton
          v-if="store.jobs.length"
          variant="ghost"
          size="sm"
          @click="confirmClearOpen = true"
        >
          <Trash2 class="h-4 w-4" />
          {{ t('reports.actions.clearHistory') }}
        </AppButton>
      </div>

      <p class="text-xs text-text-secondary font-sans">{{ t('reports.jobs.retentionNote') }}</p>

      <ReportJobsTable
        :jobs="store.jobs"
        :downloading-id="downloadingId"
        @download="handleDownload"
        @refresh="handleRefresh"
        @remove="handleRemove"
      />
    </section>

    <AppConfirmDialog
      :open="confirmClearOpen"
      :title="t('reports.confirmClear.title')"
      :message="t('reports.confirmClear.message')"
      :confirm-label="t('reports.confirmClear.confirm')"
      confirm-class="bg-danger text-white hover:opacity-80"
      @close="confirmClearOpen = false"
      @confirm="confirmClear"
    />
  </div>
</template>
