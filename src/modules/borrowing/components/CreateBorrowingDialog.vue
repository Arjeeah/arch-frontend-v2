<script setup lang="ts">
import { reactive, watch, computed } from 'vue'
import AppDialog from '@/shared/components/AppDialog.vue'
import FormInput from '@/shared/components/FormInput.vue'
import AppSelect from '@/shared/components/AppSelect.vue'
import type { Borrowing } from '../types'

const props = defineProps<{
  open: boolean
  item?: Borrowing | null
}>()

const emit = defineEmits<{
  close: []
  save: [data: Partial<Borrowing>]
}>()

const isEdit = computed(() => !!props.item)

const form = reactive({
  fileNumber: '',
  borrowerName: '',
  faculty: '',
  purpose: '',
  borrowDate: '',
  dueDate: '',
  returnDate: '',
  status: '',
})

const errors = reactive({
  fileNumber: '',
  borrowerName: '',
  faculty: '',
  purpose: '',
  borrowDate: '',
  dueDate: '',
  returnDate: '',
  status: '',
})

const statusOptions = [
  { value: 'borrowed', label: 'borrowed' },
  { value: 'returned', label: 'returned' },
  { value: 'overdue', label: 'overdue' },
]

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.fileNumber = props.item ? String(props.item.fileNumber ?? '') : ''
    form.borrowerName = props.item ? String(props.item.borrowerName ?? '') : ''
    form.faculty = props.item ? String(props.item.faculty ?? '') : ''
    form.purpose = props.item ? String(props.item.purpose ?? '') : ''
    form.borrowDate = props.item ? String(props.item.borrowDate ?? '') : ''
    form.dueDate = props.item ? String(props.item.dueDate ?? '') : ''
    form.returnDate = props.item ? String(props.item.returnDate ?? '') : ''
    form.status = props.item ? String(props.item.status ?? '') : ''
    errors.fileNumber = ''
    errors.borrowerName = ''
    errors.faculty = ''
    errors.purpose = ''
    errors.borrowDate = ''
    errors.dueDate = ''
    errors.returnDate = ''
    errors.status = ''
  },
)

function validate() {
  errors.fileNumber = form.fileNumber.trim() ? '' : 'File Number is required'
  errors.borrowerName = form.borrowerName.trim() ? '' : 'Borrower Name is required'
  errors.faculty = form.faculty.trim() ? '' : 'Faculty is required'
  errors.purpose = form.purpose.trim() ? '' : 'Purpose is required'
  errors.borrowDate = form.borrowDate.trim() ? '' : 'Borrow Date is required'
  errors.dueDate = form.dueDate.trim() ? '' : 'Due Date is required'
  errors.returnDate = form.returnDate.trim() ? '' : 'Return Date is required'
  errors.status = form.status.trim() ? '' : 'Status is required'
  return (
    !errors.fileNumber &&
    !errors.borrowerName &&
    !errors.faculty &&
    !errors.purpose &&
    !errors.borrowDate &&
    !errors.dueDate &&
    !errors.returnDate &&
    !errors.status
  )
}

function submit() {
  if (!validate()) return
  emit('save', {
    fileNumber: form.fileNumber,
    borrowerName: form.borrowerName,
    faculty: form.faculty,
    purpose: form.purpose,
    borrowDate: form.borrowDate,
    dueDate: form.dueDate,
    returnDate: form.returnDate,
    status: form.status as 'borrowed' | 'returned' | 'overdue',
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
      {{ isEdit ? 'Update the record details.' : 'Fill in the details to create a new record.' }}
    </p>

    <div class="flex flex-col gap-4">
      <div>
        <label class="block text-base font-sans text-text-primary mb-[7px]">File Number</label>
        <FormInput v-model="form.fileNumber" type="text" placeholder="Enter file number" />
        <p v-if="errors.fileNumber" class="mt-1 text-xs text-danger">{{ errors.fileNumber }}</p>
      </div>

      <div>
        <label class="block text-base font-sans text-text-primary mb-[7px]">Borrower Name</label>
        <FormInput v-model="form.borrowerName" type="text" placeholder="Enter borrower name" />
        <p v-if="errors.borrowerName" class="mt-1 text-xs text-danger">{{ errors.borrowerName }}</p>
      </div>

      <div>
        <label class="block text-base font-sans text-text-primary mb-[7px]">Faculty</label>
        <FormInput v-model="form.faculty" type="text" placeholder="Enter faculty" />
        <p v-if="errors.faculty" class="mt-1 text-xs text-danger">{{ errors.faculty }}</p>
      </div>

      <div>
        <label class="block text-base font-sans text-text-primary mb-[7px]">Purpose</label>
        <FormInput v-model="form.purpose" type="text" placeholder="Enter purpose" />
        <p v-if="errors.purpose" class="mt-1 text-xs text-danger">{{ errors.purpose }}</p>
      </div>

      <div>
        <label class="block text-base font-sans text-text-primary mb-[7px]">Borrow Date</label>
        <FormInput v-model="form.borrowDate" type="text" placeholder="Enter borrow date" />
        <p v-if="errors.borrowDate" class="mt-1 text-xs text-danger">{{ errors.borrowDate }}</p>
      </div>

      <div>
        <label class="block text-base font-sans text-text-primary mb-[7px]">Due Date</label>
        <FormInput v-model="form.dueDate" type="text" placeholder="Enter due date" />
        <p v-if="errors.dueDate" class="mt-1 text-xs text-danger">{{ errors.dueDate }}</p>
      </div>

      <div>
        <label class="block text-base font-sans text-text-primary mb-[7px]">Return Date</label>
        <FormInput v-model="form.returnDate" type="text" placeholder="Enter return date" />
        <p v-if="errors.returnDate" class="mt-1 text-xs text-danger">{{ errors.returnDate }}</p>
      </div>

      <div>
        <label class="block text-base font-sans text-text-primary mb-[7px]">Status</label>
        <AppSelect
          v-model="form.status"
          :options="statusOptions"
          placeholder="Select status"
          :placeholder-disabled="true"
        />
        <p v-if="errors.status" class="mt-1 text-xs text-danger">{{ errors.status }}</p>
      </div>
    </div>

    <template #footer>
      <button
        type="button"
        class="px-[10.6px] py-[7px] rounded-[4px] bg-[#C0D4E9] text-sm font-sans font-medium text-white transition-opacity hover:opacity-80"
        @click="emit('close')"
      >
        Cancel
      </button>
      <button
        type="button"
        class="px-[10.6px] py-[7px] rounded-[4px] bg-primary-mid text-sm font-sans font-medium text-white transition-opacity hover:opacity-80"
        @click="submit"
      >
        {{ isEdit ? 'Update Borrowing' : 'Save Borrowing' }}
      </button>
    </template>
  </AppDialog>
</template>
