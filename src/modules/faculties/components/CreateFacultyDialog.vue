<script setup lang="ts">
import { reactive, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDialog from '@/shared/components/AppDialog.vue'
import FormInput from '@/shared/components/FormInput.vue'
import type { Faculty, FacultyInput, FacultyStatus } from '../types'

const props = defineProps<{
  open: boolean
  item?: Faculty | null
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  close: []
  save: [data: FacultyInput]
}>()

const { t } = useI18n()

const isEdit = computed(() => !!props.item)

const form = reactive({
  code: '',
  nameAR: '',
  nameEN: '',
  status: 'Active' as FacultyStatus,
})

const errors = reactive({
  code: '',
  nameAR: '',
  nameEN: '',
})

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.code = props.item?.code ?? ''
    form.nameAR = props.item?.nameAR ?? ''
    form.nameEN = props.item?.nameEN ?? ''
    form.status = props.item?.status ?? 'Active'
    errors.code = ''
    errors.nameAR = ''
    errors.nameEN = ''
  },
)

function validate() {
  errors.code = form.code.trim() ? '' : t('faculties.dialog.errors.codeRequired')
  errors.nameAR = form.nameAR.trim() ? '' : t('faculties.dialog.errors.nameArRequired')
  errors.nameEN = form.nameEN.trim() ? '' : t('faculties.dialog.errors.nameEnRequired')
  return !errors.code && !errors.nameAR && !errors.nameEN
}

function submit() {
  if (!validate()) return
  emit('save', {
    code: form.code.trim(),
    nameAR: form.nameAR.trim(),
    nameEN: form.nameEN.trim(),
    status: form.status,
  })
}
</script>

<template>
  <AppDialog
    :open="open"
    :title="isEdit ? t('faculties.dialog.editTitle') : t('faculties.dialog.createTitle')"
    size="md"
    @close="emit('close')"
  >
    <p class="text-sm font-sans text-[#6F6F6F] mb-5">
      {{ isEdit ? t('faculties.dialog.editSubtitle') : t('faculties.dialog.createSubtitle') }}
    </p>

    <div class="flex flex-col gap-4">
      <div>
        <label class="block text-base font-sans text-text-primary mb-[7px]">{{
          t('faculties.dialog.codeLabel')
        }}</label>
        <FormInput
          v-model="form.code"
          type="text"
          :placeholder="t('faculties.dialog.codePlaceholder')"
        />
        <p v-if="errors.code" class="mt-1 text-xs text-danger">{{ errors.code }}</p>
      </div>

      <div>
        <label class="block text-base font-sans text-text-primary mb-[7px]">{{
          t('faculties.dialog.nameArLabel')
        }}</label>
        <FormInput
          v-model="form.nameAR"
          type="text"
          :placeholder="t('faculties.dialog.nameArPlaceholder')"
        />
        <p v-if="errors.nameAR" class="mt-1 text-xs text-danger">{{ errors.nameAR }}</p>
      </div>

      <div>
        <label class="block text-base font-sans text-text-primary mb-[7px]">{{
          t('faculties.dialog.nameEnLabel')
        }}</label>
        <FormInput
          v-model="form.nameEN"
          type="text"
          :placeholder="t('faculties.dialog.nameEnPlaceholder')"
        />
        <p v-if="errors.nameEN" class="mt-1 text-xs text-danger">{{ errors.nameEN }}</p>
      </div>

      <div class="mt-4">
        <label class="block text-base font-sans text-text-primary mb-1">{{
          t('faculties.dialog.statusLabel')
        }}</label>
        <div class="flex items-center justify-between">
          <p class="text-sm font-sans text-[#6F6F6F]">{{ t('faculties.dialog.statusHelp') }}</p>
          <div class="flex items-center gap-3 shrink-0">
            <span class="text-sm font-sans text-text-secondary">{{
              form.status === 'Active'
                ? t('faculties.status.active')
                : t('faculties.status.inactive')
            }}</span>
            <button
              type="button"
              class="relative inline-flex h-[25px] w-[46px] items-center rounded-[16px] transition-colors focus:outline-none"
              :class="form.status === 'Active' ? 'bg-primary-light' : 'bg-border'"
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
        {{ t('faculties.dialog.cancel') }}
      </button>
      <button
        type="button"
        class="px-[10.6px] py-[7px] rounded-[4px] bg-primary-mid text-sm font-sans font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
        :disabled="loading"
        @click="submit"
      >
        {{ isEdit ? t('faculties.dialog.update') : t('faculties.dialog.save') }}
      </button>
    </template>
  </AppDialog>
</template>
