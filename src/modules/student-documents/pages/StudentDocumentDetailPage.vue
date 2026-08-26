<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Eye, EyeOff, FileText, Pencil, Trash2 } from 'lucide-vue-next'
import { readSessionRole } from '@/app/config/sessionRole'
import AppButton from '@/shared/components/AppButton.vue'
import AppErrorState from '@/shared/components/AppErrorState.vue'
import AppConfirmDialog from '@/shared/components/AppConfirmDialog.vue'
import { useToasts } from '@/shared/composables/useToasts'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import { formatDate } from '@/shared/utils/date'
import PipelineStatusPanel from '../components/PipelineStatusPanel.vue'
import ExtractionDataCard from '../components/ExtractionDataCard.vue'
import DocumentSegmentsCard from '../components/DocumentSegmentsCard.vue'
import DocumentMetaDialog from '../components/DocumentMetaDialog.vue'
import { studentDocumentsApi } from '../api/studentDocumentsApi'
import { documentLookupsApi } from '../api/documentLookupsApi'
import {
  PIPELINE_BUSY_STATUSES,
  type DocumentMetaEdit,
  type DocumentSegment,
  type PipelineStatusDetail,
  type StudentDocument,
} from '../types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const toasts = useToasts()

/**
 * `readSessionRole()` rather than reading `role` off the stored user: the
 * backend's `UserResource` reports Spatie's hierarchical role names as a
 * `roles` **array** — a super admin literally holds all three — so a session
 * persisted in that shape has no scalar `role` at all and every control here
 * would silently disappear. `readSessionRole` accepts both shapes and reduces
 * an array by `AUTH_ROLES` precedence, which is also what the router guard
 * decides on, so a hidden control and a refused navigation cannot disagree.
 */
const role = readSessionRole()
const canManage = computed(() => role === 'super_admin' || role === 'archivist')

const documentId = computed(() => {
  const raw = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id
  return raw ?? null
})

const document = ref<StudentDocument | null>(null)
const documentError = ref<string | null>(null)
const documentLoading = ref(false)

const snapshot = ref<PipelineStatusDetail | null>(null)
const snapshotLoading = ref(false)

const segments = ref<DocumentSegment[]>([])
const segmentsLoading = ref(false)
const segmentsUnavailable = ref(false)

const saving = ref(false)

/**
 * Declared up here rather than beside its markup: `loadAll` closes over it and
 * runs from an `immediate` watcher below, which fires while the setup function
 * is still executing.
 */
const previewOpen = ref(false)

// ── Loading ────────────────────────────────────────────────────────────────
async function loadDocument(id: string): Promise<void> {
  documentLoading.value = true
  documentError.value = null
  try {
    document.value = await studentDocumentsApi.show(id)
  } catch (err) {
    document.value = null
    documentError.value = getApiErrorMessage(err, t('studentDocuments.errors.detailFailed'))
  } finally {
    documentLoading.value = false
  }
}

/**
 * Pipeline state lives on a different endpoint from the document itself, and
 * a failure there must not blank the page — the document is still readable.
 */
async function loadSnapshot(id: string, quiet = false): Promise<void> {
  if (!quiet) snapshotLoading.value = true
  try {
    snapshot.value = await documentLookupsApi.pipelineStatus(id)
  } catch {
    if (!quiet) snapshot.value = null
  } finally {
    snapshotLoading.value = false
  }
}

/** Best-effort: the segment view is an AI-console extra, not a contract. */
async function loadSegments(id: string): Promise<void> {
  segmentsLoading.value = true
  segmentsUnavailable.value = false
  try {
    segments.value = await documentLookupsApi.segments(id)
  } catch {
    segments.value = []
    segmentsUnavailable.value = true
  } finally {
    segmentsLoading.value = false
  }
}

async function loadAll(id: string): Promise<void> {
  previewOpen.value = false
  await Promise.all([loadDocument(id), loadSnapshot(id), loadSegments(id)])
}

// ── Polling ────────────────────────────────────────────────────────────────
/** Matches the pipeline monitor's cadence; the queue moves in tens of seconds. */
const POLL_INTERVAL_MS = 10_000

let pollTimer: ReturnType<typeof setInterval> | null = null

const isBusy = computed(
  () => snapshot.value !== null && PIPELINE_BUSY_STATUSES.includes(snapshot.value.status),
)

function stopPolling(): void {
  if (pollTimer !== null) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function startPolling(): void {
  if (pollTimer !== null) return
  pollTimer = setInterval(() => {
    const id = documentId.value
    if (!id) return
    // `quiet` keeps the panel from flashing its loading state every 10s.
    void loadSnapshot(id, true).then(() => {
      // Segments and the document's own fields only change once the pipeline
      // finishes, so they are refetched at the end rather than on every tick.
      if (!isBusy.value) {
        void loadDocument(id)
        void loadSegments(id)
      }
    })
  }, POLL_INTERVAL_MS)
}

watch(isBusy, (busy) => (busy ? startPolling() : stopPolling()), { immediate: true })

watch(
  documentId,
  (id) => {
    stopPolling()
    snapshot.value = null
    segments.value = []
    if (id) void loadAll(id)
  },
  { immediate: true },
)

onBeforeUnmount(stopPolling)

// ── Identity facts ─────────────────────────────────────────────────────────
const facts = computed(() => {
  const current = document.value
  if (!current) return []
  return [
    {
      key: 'documentType',
      label: t('studentDocuments.fields.documentType'),
      value: current.documentType?.name ?? '—',
    },
    {
      key: 'fileStatus',
      label: t('studentDocuments.fields.fileStatus'),
      value: t(`studentDocuments.fileStatus.${current.fileStatus}`),
    },
    {
      key: 'submittedAt',
      label: t('studentDocuments.fields.submittedAt'),
      value: formatDate(current.submittedAt),
    },
    {
      key: 'createdAt',
      label: t('studentDocuments.fields.createdAt'),
      value: formatDate(current.createdAt),
    },
    { key: 'notes', label: t('studentDocuments.fields.notes'), value: current.notes ?? '—' },
  ]
})

// ── Edit ───────────────────────────────────────────────────────────────────
const editOpen = ref(false)

async function handleSave(edit: DocumentMetaEdit): Promise<void> {
  const current = document.value
  if (!current) return

  saving.value = true
  try {
    // A replacement scan is staged first: `temp_upload_id` on the update is what
    // makes `MediaAssignmentService::replace` swap the media and re-run the
    // pipeline, so the two calls have to happen in this order.
    let tempUploadId: string | null = null
    if (edit.replacement) {
      const upload = await documentLookupsApi.uploadTemp(edit.replacement)
      tempUploadId = upload.id
    }

    await studentDocumentsApi.update(current.id, {
      fileStatus: edit.fileStatus,
      notes: edit.notes,
      submittedAt: edit.submittedAt,
      tempUploadId,
    })

    toasts.success(t('studentDocuments.toasts.updated', { fileNumber: current.fileNumber }))
    editOpen.value = false
    await loadAll(current.id)
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('studentDocuments.errors.saveFailed')))
  } finally {
    saving.value = false
  }
}

// ── Delete ─────────────────────────────────────────────────────────────────
const deleteOpen = ref(false)

async function confirmDelete(): Promise<void> {
  const current = document.value
  if (!current) return
  try {
    await studentDocumentsApi.delete(current.id)
    toasts.success(t('studentDocuments.toasts.deleted', { fileNumber: current.fileNumber }))
    deleteOpen.value = false
    await router.push('/student-documents')
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('studentDocuments.errors.deleteFailed')))
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <RouterLink
      to="/student-documents"
      class="inline-flex w-fit items-center gap-2 font-sans text-sm text-text-secondary hover:text-text-primary"
    >
      <ArrowLeft class="h-4 w-4 rtl:rotate-180" />
      {{ t('studentDocuments.actions.backToList') }}
    </RouterLink>

    <p v-if="documentLoading && !document" class="py-16 text-center font-sans text-text-secondary">
      {{ t('studentDocuments.states.loading') }}
    </p>

    <AppErrorState
      v-else-if="!document"
      :title="t('studentDocuments.errors.detailFailed')"
      :description="documentError ?? t('studentDocuments.errors.notFound')"
      :retry-label="t('studentDocuments.actions.retry')"
      @retry="documentId && loadAll(documentId)"
    />

    <template v-else>
      <!-- Header -->
      <section class="rounded-[10px] bg-primary-dark px-8 py-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0">
            <h1 class="font-display text-xl font-semibold text-white">
              {{ document.fileNumber || t('studentDocuments.untitled') }}
            </h1>
            <p class="mt-1 font-sans text-sm text-white/70">
              <RouterLink
                v-if="document.student"
                :to="`/students/${document.student.id}`"
                class="hover:underline"
              >
                {{ document.student.name }} · {{ document.student.studentNumber }}
              </RouterLink>
              <span v-else>{{ t('studentDocuments.noStudent') }}</span>
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <a
              v-if="document.fileUrl"
              :href="document.fileUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex h-8 items-center gap-2 rounded bg-white/15 px-2.5 font-sans text-xs font-medium text-white transition-opacity hover:opacity-90"
            >
              <FileText class="h-4 w-4" />
              {{ t('studentDocuments.actions.openFile') }}
            </a>
            <template v-if="canManage">
              <AppButton variant="primary" size="sm" @click="editOpen = true">
                <Pencil class="h-4 w-4" />
                {{ t('studentDocuments.actions.edit') }}
              </AppButton>
              <AppButton variant="danger" size="sm" @click="deleteOpen = true">
                <Trash2 class="h-4 w-4" />
                {{ t('studentDocuments.actions.delete') }}
              </AppButton>
            </template>
          </div>
        </div>
      </section>

      <!-- Identity facts -->
      <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div
          v-for="fact in facts"
          :key="fact.key"
          class="rounded-[10px] border border-border bg-surface-card p-5 shadow-sm"
        >
          <p class="mb-1 font-display text-xs text-text-muted">{{ fact.label }}</p>
          <p class="break-words font-display text-base font-semibold text-text-primary">
            {{ fact.value }}
          </p>
        </div>
      </section>

      <PipelineStatusPanel :snapshot="snapshot" :loading="snapshotLoading" :polling="isBusy" />

      <ExtractionDataCard
        :data="snapshot?.structuredData ?? null"
        :additional-fields="snapshot?.additionalFields ?? null"
        :loading="snapshotLoading"
      />

      <DocumentSegmentsCard
        :segments="segments"
        :loading="segmentsLoading"
        :unavailable="segmentsUnavailable"
      />

      <!-- Scan preview -->
      <section
        v-if="document.fileUrl"
        class="rounded-[10px] border border-border bg-surface-card shadow-sm"
      >
        <header
          class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"
        >
          <div class="min-w-0">
            <h2 class="font-display text-base font-semibold text-text-primary">
              {{ t('studentDocuments.preview.title') }}
            </h2>
            <p class="break-words font-sans text-xs text-text-secondary">
              {{ document.fileName || t('studentDocuments.preview.unnamed') }}
            </p>
          </div>
          <AppButton variant="ghost" size="sm" @click="previewOpen = !previewOpen">
            <component :is="previewOpen ? EyeOff : Eye" class="h-4 w-4" />
            {{
              previewOpen ? t('studentDocuments.preview.hide') : t('studentDocuments.preview.show')
            }}
          </AppButton>
        </header>

        <div v-if="previewOpen" class="px-5 py-4">
          <!-- Media is served from the API host, which may refuse framing; the
               header link above is always the reliable way in. -->
          <iframe
            :src="document.fileUrl"
            :title="t('studentDocuments.preview.title')"
            class="h-[70vh] w-full rounded-lg border border-border bg-surface"
          />
        </div>
      </section>
    </template>
  </div>

  <DocumentMetaDialog
    :open="editOpen"
    :document="document"
    :saving="saving"
    @close="editOpen = false"
    @save="handleSave"
  />

  <AppConfirmDialog
    :open="deleteOpen"
    :title="t('studentDocuments.deleteDialog.title')"
    :confirm-label="t('studentDocuments.actions.delete')"
    confirm-class="bg-danger text-white hover:opacity-80"
    @close="deleteOpen = false"
    @confirm="confirmDelete"
  >
    <p class="font-sans text-sm text-text-secondary">
      {{ t('studentDocuments.deleteDialog.message', { fileNumber: document?.fileNumber ?? '' }) }}
    </p>
  </AppConfirmDialog>
</template>
