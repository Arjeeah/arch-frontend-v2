<script setup lang="ts">
import { reactive, ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDialog from '@/shared/components/AppDialog.vue'
import AppAsyncSelect from '@/shared/components/AppAsyncSelect.vue'
import { borrowingApi } from '../api/borrowingApi'
import type { Borrowing } from '../types'

const props = defineProps<{
  open: boolean
  item?: Borrowing | null
  loading?: boolean
  error?: string | null
}>()

/**
 * `studentDocumentId` is only meaningful (and only sent) on create — the
 * borrowed document can't change once the request exists. The parent already
 * knows whether it's editing, so a single loosely-typed payload keeps this
 * dialog from needing two separate emits.
 */
const emit = defineEmits<{
  close: []
  save: [data: { studentDocumentId?: string; notes: string }]
}>()

const { t } = useI18n()

const isEdit = computed(() => !!props.item)

const documentOption = ref<{ value: string; label: string } | null>(null)
const notes = ref('')
const errors = reactive({ document: '' })

watch(
  () => props.open,
  (open) => {
    if (!open) return
    documentOption.value = props.item?.document
      ? { value: props.item.document.id, label: props.item.document.title }
      : null
    notes.value = props.item?.notes ?? ''
    errors.document = ''
  },
)

function searchDocuments(query: string) {
  return borrowingApi.searchDocuments(query)
}

function validate() {
  errors.document =
    isEdit.value || documentOption.value ? '' : t('borrowing.dialog.errors.documentRequired')
  return !errors.document
}

function submit() {
  if (!validate()) return
  emit('save', {
    studentDocumentId: isEdit.value ? undefined : (documentOption.value?.value ?? undefined),
    notes: notes.value.trim(),
  })
}
</script>

<template>
  <AppDialog
    :open="open"
    :title="isEdit ? t('borrowing.dialog.editTitle') : t('borrowing.dialog.createTitle')"
    size="md"
    @close="emit('close')"
  >
    <p class="text-sm font-sans text-[#6F6F6F] mb-5">
      {{ isEdit ? t('borrowing.dialog.editSubtitle') : t('borrowing.dialog.createSubtitle') }}
    </p>

    <div class="flex flex-col gap-4">
      <div>
        <label class="block text-base font-sans text-text-primary mb-[7px]">{{
          t('borrowing.dialog.documentLabel')
        }}</label>
        <AppAsyncSelect
          v-if="!isEdit"
          v-model="documentOption"
          :search-fn="searchDocuments"
          :placeholder="t('borrowing.dialog.documentPlaceholder')"
          :min-chars-text="t('borrowing.dialog.documentMinChars')"
          :empty-text="t('borrowing.dialog.documentEmpty')"
          :error-text="t('borrowing.dialog.documentSearchError')"
        />
        <p v-else class="text-sm font-sans text-text-secondary">
          {{ documentOption?.label ?? '-' }}
        </p>
        <p v-if="errors.document" class="mt-1 text-xs text-danger">{{ errors.document }}</p>
        <p v-else-if="isEdit" class="mt-1 text-xs text-[#6F6F6F]">
          {{ t('borrowing.dialog.documentLocked') }}
        </p>
      </div>

      <div>
        <label class="block text-base font-sans text-text-primary mb-[7px]">{{
          t('borrowing.dialog.notesLabel')
        }}</label>
        <textarea
          v-model="notes"
          rows="3"
          :placeholder="t('borrowing.dialog.notesPlaceholder')"
          class="w-full bg-surface-card border border-border-input rounded-[9px] px-4 py-3 font-sans text-sm text-text-primary placeholder:text-text-placeholder placeholder:font-display placeholder:font-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <p v-if="!isEdit" class="text-xs text-[#6F6F6F]">
        {{ t('borrowing.dialog.dueDateHint') }}
      </p>
    </div>

    <div v-if="error" class="mt-4 p-3 bg-danger/10 border border-danger/20 rounded-lg">
      <p class="text-sm font-sans text-danger">{{ error }}</p>
    </div>

    <template #footer>
      <button
        type="button"
        class="px-[10.6px] py-[7px] rounded-[4px] bg-[#C0D4E9] text-sm font-sans font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
        :disabled="loading"
        @click="emit('close')"
      >
        {{ t('borrowing.dialog.cancel') }}
      </button>
      <button
        type="button"
        class="px-[10.6px] py-[7px] rounded-[4px] bg-primary-mid text-sm font-sans font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
        :disabled="loading"
        @click="submit"
      >
        {{ isEdit ? t('borrowing.dialog.update') : t('borrowing.dialog.save') }}
      </button>
    </template>
  </AppDialog>
</template>
