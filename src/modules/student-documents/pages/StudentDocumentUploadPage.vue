<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, CircleCheck } from 'lucide-vue-next'
import AppSelect from '@/shared/components/AppSelect.vue'
import AppAsyncSelect from '@/shared/components/AppAsyncSelect.vue'
import AppFileUpload from '@/shared/components/AppFileUpload.vue'
import AppButton from '@/shared/components/AppButton.vue'
import FormField from '@/shared/components/FormField.vue'
import FormInput from '@/shared/components/FormInput.vue'
import { useToasts } from '@/shared/composables/useToasts'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import { studentDocumentsApi } from '../api/studentDocumentsApi'
import { documentLookupsApi } from '../api/documentLookupsApi'
import {
  FILE_STATUSES,
  UPLOAD_ACCEPT,
  UPLOAD_MAX_SIZE_MB,
  type FileStatus,
  type LookupOption,
  type StudentDocument,
} from '../types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const toasts = useToasts()

const student = ref<LookupOption | null>(null)
const files = ref<File[]>([])
const documentTypes = ref<LookupOption[]>([])
const uploadProgress = ref<Record<string, number>>({})

const form = reactive({
  documentTypeId: '',
  fileStatus: 'complete' as string,
  submittedAt: '',
  notes: '',
})

const errors = reactive<Record<string, string>>({})
const submitting = ref(false)
const created = ref<StudentDocument | null>(null)

/**
 * The temp upload survives a failed document-create so a retry does not push
 * the same megabytes twice. It is discarded when the user starts over.
 */
const stagedUploadId = ref<string | null>(null)

const fileStatusOptions = computed(() =>
  FILE_STATUSES.map((value) => ({ value, label: t(`studentDocuments.fileStatus.${value}`) })),
)

async function loadDocumentTypes(): Promise<void> {
  try {
    documentTypes.value = await documentLookupsApi.documentTypes()
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('studentDocuments.errors.lookupFailed')))
  }
}
void loadDocumentTypes()

/** `/student-documents/upload?student=<uuid>` arrives from the student page. */
async function prefillStudent(): Promise<void> {
  const raw = route.query.student
  const id = Array.isArray(raw) ? raw[0] : raw
  if (!id) return
  try {
    student.value = await documentLookupsApi.student(id)
  } catch {
    // A stale link should not block the form — the user can pick a student.
    student.value = null
  }
}
void prefillStudent()

/**
 * `AppFileUpload` phrases its own rejection reasons in hardcoded English and
 * lists them under the dropzone — it lives in `src/shared/`, so this stream
 * cannot translate them there. Report the constraint in the reader's language
 * instead of echoing the English string into a toast as well.
 */
function onUploadRejected(messages: string[]): void {
  if (messages.length === 0) return
  toasts.error(t('studentDocuments.errors.fileRejected', { max: UPLOAD_MAX_SIZE_MB }))
}

/** Drops a scan a previous attempt left staged on the server. */
async function discardStaged(): Promise<void> {
  const orphan = stagedUploadId.value
  if (!orphan) return
  stagedUploadId.value = null
  try {
    await documentLookupsApi.discardTemp(orphan)
  } catch {
    // Not worth reporting — the backend expires temp uploads after 24 hours.
  }
}

watch(files, () => {
  delete errors.file
  uploadProgress.value = {}
  // Choosing a different scan invalidates whatever a failed attempt staged.
  // Without this, `submit()` sees a non-null `stagedUploadId`, skips the
  // upload step and attaches the *previous* file to the new document.
  void discardStaged()
})

function toFileStatus(raw: string): FileStatus {
  return FILE_STATUSES.find((status) => status === raw) ?? 'complete'
}

function validate(): boolean {
  for (const key of Object.keys(errors)) delete errors[key]

  if (!student.value) errors.student = t('studentDocuments.errors.studentRequired')
  if (!form.documentTypeId) errors.documentTypeId = t('studentDocuments.errors.typeRequired')
  if (files.value.length === 0 && !stagedUploadId.value)
    errors.file = t('studentDocuments.errors.fileRequired')
  // Mirrors `StoreStudentDocumentRequest`: `notes` is `max:1000`.
  if (form.notes.trim().length > 1000)
    errors.notes = t('studentDocuments.errors.notesTooLong', { max: 1000 }, 1000)

  return Object.keys(errors).length === 0
}

async function submit(): Promise<void> {
  if (!validate() || submitting.value) return
  const chosenStudent = student.value
  if (!chosenStudent) return

  submitting.value = true
  try {
    // 1. Stage the file, unless a previous attempt already did.
    if (!stagedUploadId.value) {
      const file = files.value[0]
      if (!file) return
      const upload = await documentLookupsApi.uploadTemp(file, (percent) => {
        uploadProgress.value = { ...uploadProgress.value, [file.name]: percent }
      })
      stagedUploadId.value = upload.id
    }

    // 2. Create the document. Carrying `temp_upload_id` attaches the media and
    //    dispatches the extraction pipeline in one step (MediaAssignmentService).
    const document = await studentDocumentsApi.create({
      studentId: chosenStudent.value,
      documentTypeId: form.documentTypeId,
      fileStatus: toFileStatus(form.fileStatus),
      notes: form.notes.trim() || null,
      submittedAt: form.submittedAt || null,
      tempUploadId: stagedUploadId.value,
    })

    stagedUploadId.value = null
    created.value = document
    toasts.success(t('studentDocuments.toasts.created', { fileNumber: document.fileNumber }))
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('studentDocuments.errors.uploadFailed')))
  } finally {
    submitting.value = false
  }
}

/** Clears the form for a second upload, dropping any file left staged. */
async function startOver(): Promise<void> {
  await discardStaged()
  created.value = null
  files.value = []
  uploadProgress.value = {}
  form.documentTypeId = ''
  form.fileStatus = 'complete'
  form.submittedAt = ''
  form.notes = ''
  for (const key of Object.keys(errors)) delete errors[key]
}

function goToDocument(): void {
  if (created.value) void router.push(`/student-documents/${created.value.id}`)
}
</script>

<template>
  <div class="flex max-w-3xl flex-col gap-6">
    <RouterLink
      to="/student-documents"
      class="inline-flex w-fit items-center gap-2 font-sans text-sm text-text-secondary hover:text-text-primary"
    >
      <ArrowLeft class="h-4 w-4 rtl:rotate-180" />
      {{ t('studentDocuments.actions.backToList') }}
    </RouterLink>

    <div>
      <h1 class="font-display text-2xl font-semibold text-text-primary">
        {{ t('studentDocuments.upload.title') }}
      </h1>
      <p class="mt-0.5 font-sans text-sm text-text-secondary">
        {{ t('studentDocuments.upload.subtitle') }}
      </p>
    </div>

    <!-- Result panel -->
    <section
      v-if="created"
      class="flex flex-col gap-3 rounded-[10px] border border-success/40 bg-success-bg px-5 py-4"
    >
      <div class="flex items-center gap-2">
        <CircleCheck class="h-5 w-5 text-success-text" />
        <p class="font-display text-sm font-medium text-success-text">
          {{ t('studentDocuments.upload.queuedTitle', { fileNumber: created.fileNumber }) }}
        </p>
      </div>
      <p class="font-sans text-sm text-text-secondary">
        {{ t('studentDocuments.upload.queuedDescription') }}
      </p>
      <div class="flex flex-wrap gap-2">
        <AppButton variant="primary" size="sm" @click="goToDocument">
          {{ t('studentDocuments.upload.viewDocument') }}
        </AppButton>
        <AppButton variant="ghost" size="sm" @click="startOver">
          {{ t('studentDocuments.upload.uploadAnother') }}
        </AppButton>
      </div>
    </section>

    <form v-else class="flex flex-col gap-5" @submit.prevent="submit">
      <FormField
        :label="t('studentDocuments.fields.student')"
        field-id="document-student"
        :error="errors.student"
      >
        <AppAsyncSelect
          id="document-student"
          v-model="student"
          :search-fn="documentLookupsApi.searchStudents"
          :placeholder="t('studentDocuments.placeholders.student')"
          :loading-text="t('studentDocuments.states.loading')"
          :empty-text="t('studentDocuments.filters.studentEmpty')"
          :error-text="t('studentDocuments.errors.lookupFailed')"
          :min-chars-text="t('studentDocuments.filters.studentMinChars')"
          :clear-label="t('studentDocuments.actions.clearStudent')"
        />
      </FormField>

      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField
          :label="t('studentDocuments.fields.documentType')"
          field-id="document-type"
          :error="errors.documentTypeId"
        >
          <AppSelect
            v-model="form.documentTypeId"
            :options="documentTypes"
            :placeholder="t('studentDocuments.placeholders.documentType')"
            placeholder-disabled
          />
        </FormField>

        <FormField :label="t('studentDocuments.fields.fileStatus')" field-id="document-status">
          <AppSelect v-model="form.fileStatus" :options="fileStatusOptions" />
        </FormField>

        <FormField :label="t('studentDocuments.fields.submittedAt')" field-id="document-submitted">
          <FormInput id="document-submitted" v-model="form.submittedAt" type="date" />
        </FormField>

        <FormField
          :label="t('studentDocuments.fields.notes')"
          field-id="document-notes"
          :error="errors.notes"
        >
          <FormInput
            id="document-notes"
            v-model="form.notes"
            :placeholder="t('studentDocuments.placeholders.notes')"
          />
        </FormField>
      </div>

      <FormField :label="t('studentDocuments.fields.file')" :error="errors.file">
        <AppFileUpload
          v-model:files="files"
          :accept="UPLOAD_ACCEPT"
          :max-size-mb="UPLOAD_MAX_SIZE_MB"
          :max-files="1"
          :multiple="false"
          :progress="uploadProgress"
          :label="t('studentDocuments.upload.dropLabel')"
          :browse-label="t('studentDocuments.upload.browse')"
          :hint="t('studentDocuments.upload.hint', { max: UPLOAD_MAX_SIZE_MB })"
          :remove-label="t('studentDocuments.upload.removeFile')"
          :disabled="submitting"
          @error="onUploadRejected"
        />
      </FormField>

      <p
        v-if="stagedUploadId"
        class="rounded-lg bg-highlight/40 px-3 py-2 font-sans text-xs text-text-secondary"
      >
        {{ t('studentDocuments.upload.staged') }}
      </p>

      <div class="flex items-center justify-end gap-3">
        <AppButton variant="ghost" :disabled="submitting" @click="startOver">
          {{ t('studentDocuments.actions.reset') }}
        </AppButton>
        <AppButton type="submit" variant="primary" :loading="submitting">
          {{ t('studentDocuments.actions.submitUpload') }}
        </AppButton>
      </div>
    </form>
  </div>
</template>
