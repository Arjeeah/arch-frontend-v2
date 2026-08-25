<script setup lang="ts">
import { reactive, watch, computed } from 'vue'
import AppDialog from '@/shared/components/AppDialog.vue'
import FormInput from '@/shared/components/FormInput.vue'
import { toDateInputValue } from '@/shared/utils/date'
import type { Borrowing, BorrowingInput } from '../types'

const props = defineProps<{
  open: boolean
  item?: Borrowing | null
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  close: []
  save: [data: BorrowingInput]
}>()

const isEdit = computed(() => !!props.item)

const form = reactive({
  studentDocumentId: '',
  purpose: '',
  dueDate: '',
})

const errors = reactive({
  studentDocumentId: '',
  purpose: '',
  dueDate: '',
})

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.studentDocumentId = props.item?.document ? String(props.item.document.id) : ''
    form.purpose = props.item?.purpose ?? ''
    form.dueDate = toDateInputValue(props.item?.dueDate)
    errors.studentDocumentId = ''
    errors.purpose = ''
    errors.dueDate = ''
  },
)

function validate() {
  const documentId = Number(form.studentDocumentId)
  if (isEdit.value) {
    errors.studentDocumentId = ''
  } else if (!form.studentDocumentId.trim()) {
    errors.studentDocumentId = 'Document ID is required'
  } else if (!Number.isInteger(documentId) || documentId <= 0) {
    errors.studentDocumentId = 'Document ID must be a positive number'
  } else {
    errors.studentDocumentId = ''
  }

  errors.purpose = form.purpose.trim() ? '' : 'Purpose is required'
  errors.dueDate = form.dueDate ? '' : 'Due date is required'

  return !errors.studentDocumentId && !errors.purpose && !errors.dueDate
}

function submit() {
  if (!validate()) return
  emit('save', {
    studentDocumentId: Number(form.studentDocumentId),
    purpose: form.purpose.trim(),
    dueDate: form.dueDate,
  })
}
</script>

<template>
  <AppDialog
    :open="open"
    :title="isEdit ? 'Edit Borrowing' : 'Create Borrowing'"
    size="md"
    @close="emit('close')"
  >
    <p class="text-sm font-sans text-[#6F6F6F] mb-5">
      {{
        isEdit
          ? 'Update the request details. Status changes happen through the row actions.'
          : 'Fill in the details to create a new borrowing request.'
      }}
    </p>

    <div class="flex flex-col gap-4">
      <div>
        <label class="block text-base font-sans text-text-primary mb-[7px]">Document ID</label>
        <FormInput
          v-model="form.studentDocumentId"
          type="number"
          placeholder="Enter the archived document ID"
          :disabled="isEdit"
        />
        <p v-if="errors.studentDocumentId" class="mt-1 text-xs text-danger">
          {{ errors.studentDocumentId }}
        </p>
        <p v-else-if="isEdit" class="mt-1 text-xs text-[#6F6F6F]">
          The borrowed document cannot be changed after the request is created.
        </p>
      </div>

      <div>
        <label class="block text-base font-sans text-text-primary mb-[7px]">Purpose</label>
        <FormInput v-model="form.purpose" type="text" placeholder="Enter purpose" />
        <p v-if="errors.purpose" class="mt-1 text-xs text-danger">{{ errors.purpose }}</p>
      </div>

      <div>
        <label class="block text-base font-sans text-text-primary mb-[7px]">Due Date</label>
        <FormInput v-model="form.dueDate" type="date" />
        <p v-if="errors.dueDate" class="mt-1 text-xs text-danger">{{ errors.dueDate }}</p>
      </div>
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
        Cancel
      </button>
      <button
        type="button"
        class="px-[10.6px] py-[7px] rounded-[4px] bg-primary-mid text-sm font-sans font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
        :disabled="loading"
        @click="submit"
      >
        {{ isEdit ? 'Update Borrowing' : 'Save Borrowing' }}
      </button>
    </template>
  </AppDialog>
</template>
