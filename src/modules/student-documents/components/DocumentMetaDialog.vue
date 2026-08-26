<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDialog from '@/shared/components/AppDialog.vue'
import AppSelect from '@/shared/components/AppSelect.vue'
import AppButton from '@/shared/components/AppButton.vue'
import AppFileUpload from '@/shared/components/AppFileUpload.vue'
import FormField from '@/shared/components/FormField.vue'
import FormInput from '@/shared/components/FormInput.vue'
import { toDateInputValue } from '@/shared/utils/date'
import {
  FILE_STATUSES,
  UPLOAD_ACCEPT,
  UPLOAD_MAX_SIZE_MB,
  type DocumentMetaEdit,
  type FileStatus,
  type StudentDocument,
} from '../types'

const props = defineProps<{
  open: boolean
  document: StudentDocument | null
  saving?: boolean
}>()

const emit = defineEmits<{ close: []; save: [edit: DocumentMetaEdit] }>()

const { t } = useI18n()

const form = reactive({
  fileStatus: 'complete' as string,
  notes: '',
  submittedAt: '',
})
const replacementFiles = ref<File[]>([])
const notesError = ref('')
const fileError = ref('')

const fileStatusOptions = computed(() =>
  FILE_STATUSES.map((value) => ({ value, label: t(`studentDocuments.fileStatus.${value}`) })),
)

watch(
  () => [props.open, props.document?.id] as const,
  ([open]) => {
    if (!open) return
    const document = props.document
    form.fileStatus = document?.fileStatus ?? 'complete'
    form.notes = document?.notes ?? ''
    // `submitted_at` is a datetime on the wire; the input wants a bare date.
    form.submittedAt = toDateInputValue(document?.submittedAt)
    replacementFiles.value = []
    notesError.value = ''
    fileError.value = ''
  },
  { immediate: true },
)

watch(replacementFiles, () => {
  fileError.value = ''
})

/**
 * `AppFileUpload` phrases its rejection reasons in hardcoded English and it
 * lives in `src/shared/`, outside this stream — so surface the constraint in
 * the reader's language rather than repeating its wording.
 */
function onFileRejected(messages: string[]): void {
  if (messages.length === 0) return
  fileError.value = t('studentDocuments.errors.fileRejected', { max: UPLOAD_MAX_SIZE_MB })
}

function toFileStatus(raw: string): FileStatus {
  return FILE_STATUSES.find((status) => status === raw) ?? 'complete'
}

function submit(): void {
  // Mirrors `UpdateStudentDocumentRequest`: `notes` is `max:1000`.
  if (form.notes.trim().length > 1000) {
    notesError.value = t('studentDocuments.errors.notesTooLong', { max: 1000 })
    return
  }
  notesError.value = ''

  emit('save', {
    fileStatus: toFileStatus(form.fileStatus),
    notes: form.notes.trim() || null,
    submittedAt: form.submittedAt || null,
    replacement: replacementFiles.value[0] ?? null,
  })
}
</script>

<template>
  <AppDialog
    :open="open"
    :title="t('studentDocuments.editDialog.title')"
    size="md"
    @close="emit('close')"
  >
    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <FormField :label="t('studentDocuments.fields.fileStatus')" field-id="edit-file-status">
        <AppSelect v-model="form.fileStatus" :options="fileStatusOptions" />
      </FormField>

      <FormField :label="t('studentDocuments.fields.submittedAt')" field-id="edit-submitted">
        <FormInput id="edit-submitted" v-model="form.submittedAt" type="date" />
      </FormField>

      <FormField
        :label="t('studentDocuments.fields.notes')"
        field-id="edit-notes"
        :error="notesError"
      >
        <FormInput
          id="edit-notes"
          v-model="form.notes"
          :placeholder="t('studentDocuments.placeholders.notes')"
        />
      </FormField>

      <FormField :label="t('studentDocuments.editDialog.replaceFile')" :error="fileError">
        <AppFileUpload
          v-model:files="replacementFiles"
          :accept="UPLOAD_ACCEPT"
          :max-size-mb="UPLOAD_MAX_SIZE_MB"
          :max-files="1"
          :multiple="false"
          :label="t('studentDocuments.upload.dropLabel')"
          :browse-label="t('studentDocuments.upload.browse')"
          :hint="t('studentDocuments.editDialog.replaceHint')"
          :remove-label="t('studentDocuments.upload.removeFile')"
          :disabled="saving"
          @error="onFileRejected"
        />
      </FormField>
    </form>

    <template #footer>
      <AppButton variant="ghost" @click="emit('close')">
        {{ t('studentDocuments.actions.cancel') }}
      </AppButton>
      <AppButton variant="primary" :loading="saving" @click="submit">
        {{ t('studentDocuments.actions.save') }}
      </AppButton>
    </template>
  </AppDialog>
</template>
