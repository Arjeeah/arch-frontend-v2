<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDialog from '@/shared/components/AppDialog.vue'
import AppSelect from '@/shared/components/AppSelect.vue'
import FormField from '@/shared/components/FormField.vue'
import FormInput from '@/shared/components/FormInput.vue'
import { facultyLookupApi } from '../api/programsApi'
import type { Program, ProgramInput } from '../types'

const props = defineProps<{
  open: boolean
  item?: Program | null
}>()

const emit = defineEmits<{
  close: []
  save: [data: ProgramInput]
}>()

const { t } = useI18n()

const isEdit = computed(() => !!props.item)

const form = reactive({
  facultyId: '',
  code: '',
  nameAr: '',
  nameEn: '',
  status: 'active' as ProgramInput['status'],
})

const errors = reactive({ facultyId: '', code: '', nameAr: '', nameEn: '' })

const facultyOptions = ref<{ value: string; label: string }[]>([])
const facultiesLoading = ref(false)
const facultiesFailed = ref(false)

async function loadFaculties() {
  facultiesLoading.value = true
  facultiesFailed.value = false
  try {
    facultyOptions.value = await facultyLookupApi.listOptions()
  } catch {
    facultiesFailed.value = true
  } finally {
    facultiesLoading.value = false
  }
}

onMounted(loadFaculties)

const statusOptions = computed(() => [
  { value: 'active', label: t('programs.status.active') },
  { value: 'inactive', label: t('programs.status.inactive') },
])

watch(
  () => props.open,
  (open) => {
    if (!open) return
    const item = props.item
    form.facultyId = item ? String(item.facultyId) : ''
    form.code = item?.code ?? ''
    form.nameAr = item?.nameAr ?? ''
    form.nameEn = item?.nameEn ?? ''
    form.status = item?.status ?? 'active'
    errors.facultyId = ''
    errors.code = ''
    errors.nameAr = ''
    errors.nameEn = ''
    if (facultyOptions.value.length === 0 && !facultiesLoading.value) void loadFaculties()
  },
)

function validate(): boolean {
  errors.facultyId = form.facultyId ? '' : t('programs.dialog.facultyRequired')
  errors.code = form.code.trim() ? '' : t('programs.dialog.codeRequired')
  errors.nameAr = form.nameAr.trim() ? '' : t('programs.dialog.nameArRequired')
  errors.nameEn = form.nameEn.trim() ? '' : t('programs.dialog.nameEnRequired')
  return !errors.facultyId && !errors.code && !errors.nameAr && !errors.nameEn
}

function submit() {
  if (!validate()) return
  emit('save', {
    facultyId: Number(form.facultyId),
    code: form.code.trim(),
    nameAr: form.nameAr.trim(),
    nameEn: form.nameEn.trim(),
    status: form.status,
  })
}
</script>

<template>
  <AppDialog
    :open="open"
    :title="isEdit ? t('programs.dialog.editTitle') : t('programs.dialog.createTitle')"
    size="md"
    @close="emit('close')"
  >
    <p class="text-sm font-sans text-[#6F6F6F] mb-5">
      {{ isEdit ? t('programs.dialog.editSubtitle') : t('programs.dialog.createSubtitle') }}
    </p>

    <div class="flex flex-col gap-4">
      <FormField
        :label="t('programs.fields.faculty')"
        field-id="program-faculty"
        :error="errors.facultyId"
      >
        <AppSelect
          id="program-faculty"
          v-model="form.facultyId"
          :options="facultyOptions"
          :placeholder="
            facultiesLoading
              ? t('programs.dialog.facultiesLoading')
              : t('programs.dialog.facultyPlaceholder')
          "
          :placeholder-disabled="true"
        />
        <p v-if="facultiesFailed" class="mt-1 text-xs text-danger">
          {{ t('programs.dialog.facultiesLoadFailed') }}
        </p>
      </FormField>

      <FormField :label="t('programs.fields.code')" field-id="program-code" :error="errors.code">
        <FormInput
          id="program-code"
          v-model="form.code"
          :placeholder="t('programs.dialog.codePlaceholder')"
        />
      </FormField>

      <FormField
        :label="t('programs.fields.nameAr')"
        field-id="program-name-ar"
        :error="errors.nameAr"
      >
        <FormInput
          id="program-name-ar"
          v-model="form.nameAr"
          dir="rtl"
          :placeholder="t('programs.dialog.nameArPlaceholder')"
        />
      </FormField>

      <FormField
        :label="t('programs.fields.nameEn')"
        field-id="program-name-en"
        :error="errors.nameEn"
      >
        <FormInput
          id="program-name-en"
          v-model="form.nameEn"
          :placeholder="t('programs.dialog.nameEnPlaceholder')"
        />
      </FormField>

      <FormField :label="t('programs.fields.status')" field-id="program-status">
        <AppSelect id="program-status" v-model="form.status" :options="statusOptions" />
      </FormField>
    </div>

    <template #footer>
      <button
        type="button"
        class="px-[10.6px] py-[7px] rounded-[4px] bg-[#C0D4E9] text-sm font-sans font-medium text-white transition-opacity hover:opacity-80"
        @click="emit('close')"
      >
        {{ t('programs.dialog.cancel') }}
      </button>
      <button
        type="button"
        class="px-[10.6px] py-[7px] rounded-[4px] bg-primary-mid text-sm font-sans font-medium text-white transition-opacity hover:opacity-80"
        @click="submit"
      >
        {{ isEdit ? t('programs.dialog.update') : t('programs.dialog.save') }}
      </button>
    </template>
  </AppDialog>
</template>
