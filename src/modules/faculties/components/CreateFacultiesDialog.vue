<script setup lang="ts">
import { reactive, watch, computed } from 'vue'
import AppDialog from '@/shared/components/AppDialog.vue'
import FormInput from '@/shared/components/FormInput.vue'
import type { Faculties } from '../types'

const props = defineProps<{
  open: boolean
  item?: Faculties | null
}>()

const emit = defineEmits<{
  close: []
  save: [data: Partial<Faculties>]
}>()

const isEdit = computed(() => !!props.item)

const form = reactive({
  code: '',
  nameAR: '',
  nameEN: '',
  programs: '',
  files: '',
  status: 'Acitve' as 'Active' | 'Inactive',
})

const errors = reactive({
  code: '',
  nameAR: '',
  nameEN: '',
  programs: '',
  files: '',
  status: '',
})

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.code = props.item ? String(props.item.code ?? '') : ''
    form.nameAR = props.item ? String(props.item.nameAR ?? '') : ''
    form.nameEN = props.item ? String(props.item.nameEN ?? '') : ''
    form.programs = props.item ? String(props.item.programs ?? '') : ''
    form.files = props.item ? String(props.item.files ?? '') : ''
    form.status = props.item?.status as 'Active' | 'Inactive'
    errors.code = ''
    errors.nameAR = ''
    errors.nameEN = ''
    errors.programs = ''
    errors.files = ''
    errors.status = ''
  },
)

function validate() {
  console.log('form object state:', form)
  errors.code = (form.code || '').trim() ? '' : 'Code is required'
  errors.nameAR = (form.nameAR || '').trim() ? '' : 'Name AR is required'
  errors.nameEN = (form.nameEN || '').trim() ? '' : 'Name EN is required'
  errors.programs = (form.programs || '').trim() ? '' : 'Programs is required'
  errors.files = (form.files || '').trim() ? '' : 'Files is required'
  errors.status = (form.status || '').trim() ? '' : 'Status is required'
  return (
    !errors.code &&
    !errors.nameAR &&
    !errors.nameEN &&
    !errors.programs &&
    !errors.files &&
    !errors.status
  )
}

function submit() {
  if (!validate()) return
  emit('save', {
    code: form.code,
    nameAR: form.nameAR,
    nameEN: form.nameEN,
    programs: Number(form.programs),
    files: Number(form.files),
    status: form.status,
  })
}
</script>

<template>
  <AppDialog
    :open="open"
    :title="isEdit ? 'Edit Faculty' : 'Create Faculty'"
    size="md"
    @close="emit('close')"
  >
    <p class="text-sm font-sans text-[#6F6F6F] mb-5">
      {{ isEdit ? 'Update faculty details.' : 'Add a new faculty to the system.' }}
    </p>

    <div class="flex flex-col gap-4">
      <div>
        <label class="block text-base font-sans text-text-primary mb-[7px]">Code</label>
        <FormInput v-model="form.code" type="text" placeholder="Enter Code" />
        <p v-if="errors.code" class="mt-1 text-xs text-danger">{{ errors.code }}</p>
      </div>

      <div>
        <label class="block text-base font-sans text-text-primary mb-[7px]">Name AR</label>
        <FormInput v-model="form.nameAR" type="text" placeholder="e.g. تقنية المعلومات" />
        <p v-if="errors.nameAR" class="mt-1 text-xs text-danger">{{ errors.nameAR }}</p>
      </div>

      <div>
        <label class="block text-base font-sans text-text-primary mb-[7px]">Name EN</label>
        <FormInput v-model="form.nameEN" type="text" placeholder="e.g. Information Technology" />
        <p v-if="errors.nameEN" class="mt-1 text-xs text-danger">{{ errors.nameEN }}</p>
      </div>

      <div>
        <label class="block text-base font-sans text-text-primary mb-[7px]">Programs</label>
        <FormInput v-model="form.programs" type="number" placeholder="Enter number of programs" />
        <p v-if="errors.programs" class="mt-1 text-xs text-danger">{{ errors.programs }}</p>
      </div>

      <div>
        <label class="block text-base font-sans text-text-primary mb-[7px]">Files</label>
        <FormInput v-model="form.files" type="number" placeholder="Enter number of files" />
        <p v-if="errors.files" class="mt-1 text-xs text-danger">{{ errors.files }}</p>
      </div>

      <div class="mt-4">
        <label class="block text-base font-sans text-text-primary mb-1">Status</label>
        <div class="flex items-center justify-between">
          <p class="text-sm font-sans text-[#6F6F6F]">Set faculty status as active or inactive</p>
          <div class="flex items-center gap-3 shrink-0">
            <span class="text-sm font-sans text-[#595959]">{{ form.status }}</span>
            <button
              type="button"
              class="relative inline-flex h-[25px] w-[46px] items-center rounded-[16px] transition-colors focus:outline-none"
              :class="form.status === 'Active' ? 'bg-[#ACC6E8]' : 'bg-border'"
              @click="form.status = form.status === 'Active' ? 'Inactive' : 'Active'"
            >
              <span
                class="inline-block h-[19px] w-[19px] transform rounded-[16px] bg-white shadow-[0px_3px_7px_rgba(0,0,0,0.12)] transition-transform"
                :class="form.status === 'Active' ? 'translate-x-[24px]' : 'translate-x-[2px]'"
              />
            </button>
          </div>
        </div>
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
        {{ isEdit ? 'Update Faculty' : 'Save Faculty' }}
      </button>
    </template>
  </AppDialog>
</template>
