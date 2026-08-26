<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDialog from '@/shared/components/AppDialog.vue'
import AppSelect from '@/shared/components/AppSelect.vue'
import AppAsyncSelect from '@/shared/components/AppAsyncSelect.vue'
import AppButton from '@/shared/components/AppButton.vue'
import FormField from '@/shared/components/FormField.vue'
import FormInput from '@/shared/components/FormInput.vue'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import { studentLookupsApi } from '../api/studentLookupsApi'
import {
  LOCATION_STATUSES,
  STUDENT_STATUSES,
  drawerLabel,
  type LookupOption,
  type Student,
  type StudentInput,
  type LocationStatus,
  type StudentStatus,
} from '../types'

const props = defineProps<{
  open: boolean
  /** `null` creates, a student edits. */
  student: Student | null
  saving?: boolean
}>()

const emit = defineEmits<{ close: []; save: [input: StudentInput] }>()

const { t, locale } = useI18n()

/**
 * Every field is a string: `AppSelect` and `FormInput` both speak strings, and
 * the enum/number narrowing happens once, in `submit()`.
 */
interface FormState {
  studentNumber: string
  name: string
  nationality: string
  email: string
  phone: string
  facultyId: string
  programId: string
  enrollmentYear: string
  graduationYear: string
  studentStatus: string
  locationStatus: string
}

function blankForm(): FormState {
  return {
    studentNumber: '',
    name: '',
    nationality: '',
    email: '',
    phone: '',
    facultyId: '',
    programId: '',
    enrollmentYear: '',
    graduationYear: '',
    studentStatus: 'active',
    locationStatus: 'in_location',
  }
}

const form = reactive<FormState>(blankForm())
const drawer = ref<LookupOption | null>(null)
const errors = reactive<Record<string, string>>({})

const faculties = ref<LookupOption[]>([])
const programs = ref<LookupOption[]>([])
const facultiesLoading = ref(false)
const programsLoading = ref(false)
const lookupError = ref<string | null>(null)

const isEditing = computed(() => props.student !== null)

const statusOptions = computed(() =>
  STUDENT_STATUSES.map((value) => ({ value, label: t(`students.status.${value}`) })),
)
const locationOptions = computed(() =>
  LOCATION_STATUSES.map((value) => ({ value, label: t(`students.location.${value}`) })),
)

async function loadFaculties(): Promise<void> {
  facultiesLoading.value = true
  lookupError.value = null
  try {
    faculties.value = await studentLookupsApi.faculties(locale.value)
  } catch (err) {
    faculties.value = []
    lookupError.value = getApiErrorMessage(err, t('students.errors.lookupFailed'))
  } finally {
    facultiesLoading.value = false
  }
}

async function loadPrograms(facultyId: string): Promise<void> {
  if (!facultyId) {
    programs.value = []
    return
  }
  programsLoading.value = true
  try {
    programs.value = await studentLookupsApi.programs(facultyId, locale.value)
  } catch (err) {
    programs.value = []
    lookupError.value = getApiErrorMessage(err, t('students.errors.lookupFailed'))
  } finally {
    programsLoading.value = false
  }
}

/** Fills the form from the student being edited, or clears it for a create. */
function resetForm(): void {
  Object.assign(form, blankForm())
  for (const key of Object.keys(errors)) delete errors[key]
  lookupError.value = null

  const student = props.student
  if (!student) {
    drawer.value = null
    programs.value = []
    return
  }

  Object.assign(form, {
    studentNumber: student.studentNumber,
    name: student.name,
    nationality: student.nationality,
    email: student.email ?? '',
    phone: student.phone ?? '',
    facultyId: student.facultyId !== null ? String(student.facultyId) : '',
    programId: student.programId !== null ? String(student.programId) : '',
    enrollmentYear: student.enrollmentYear !== null ? String(student.enrollmentYear) : '',
    graduationYear: student.graduationYear !== null ? String(student.graduationYear) : '',
    studentStatus: student.studentStatus,
    locationStatus: student.locationStatus,
  })

  drawer.value = student.drawer
    ? { value: student.drawer.id, label: drawerLabel(student.drawer) }
    : null

  void loadPrograms(form.facultyId)
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    resetForm()
    if (faculties.value.length === 0) void loadFaculties()
  },
  { immediate: true },
)

/**
 * Option labels are locale-picked at fetch time, so a language switch has to
 * refetch both lists — the cache check above would otherwise keep serving the
 * previous language's names for as long as the tab stays open.
 */
watch(locale, () => {
  if (faculties.value.length > 0) void loadFaculties()
  if (form.facultyId) void loadPrograms(form.facultyId)
})

/**
 * Changing faculty invalidates the chosen program — the backend has no
 * cross-check, so a stale program would be saved against the wrong faculty.
 */
function onFacultyChange(value: string): void {
  form.facultyId = value
  form.programId = ''
  void loadPrograms(value)
}

function parseYear(raw: string): number | null {
  if (!raw.trim()) return null
  const value = Number(raw)
  return Number.isInteger(value) ? value : null
}

function toStudentStatus(raw: string): StudentStatus {
  return STUDENT_STATUSES.find((status) => status === raw) ?? 'active'
}

function toLocationStatus(raw: string): LocationStatus {
  return LOCATION_STATUSES.find((status) => status === raw) ?? 'in_location'
}

/** Mirrors `StoreStudentRequest` / `UpdateStudentRequest` so the API rarely 422s. */
function validate(): boolean {
  for (const key of Object.keys(errors)) delete errors[key]

  if (!form.studentNumber.trim()) errors.studentNumber = t('students.errors.required')
  else if (form.studentNumber.trim().length > 50)
    errors.studentNumber = t('students.errors.maxLength', { max: 50 })

  if (!form.name.trim()) errors.name = t('students.errors.required')
  else if (form.name.trim().length > 255) errors.name = t('students.errors.maxLength', { max: 255 })

  if (!form.nationality.trim()) errors.nationality = t('students.errors.required')
  else if (form.nationality.trim().length > 100)
    errors.nationality = t('students.errors.maxLength', { max: 100 })

  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
    errors.email = t('students.errors.email')

  if (form.phone.trim().length > 20) errors.phone = t('students.errors.maxLength', { max: 20 })

  if (!form.facultyId) errors.facultyId = t('students.errors.required')
  if (!form.programId) errors.programId = t('students.errors.required')

  const enrollment = parseYear(form.enrollmentYear)
  if (enrollment === null) errors.enrollmentYear = t('students.errors.required')
  else if (enrollment < 1900 || enrollment > 2100)
    errors.enrollmentYear = t('students.errors.yearRange')

  const graduation = parseYear(form.graduationYear)
  if (form.graduationYear.trim() && graduation === null)
    errors.graduationYear = t('students.errors.yearRange')
  else if (graduation !== null && (graduation < 1900 || graduation > 2100))
    errors.graduationYear = t('students.errors.yearRange')
  else if (graduation !== null && enrollment !== null && graduation < enrollment)
    errors.graduationYear = t('students.errors.graduationBeforeEnrollment')

  return Object.keys(errors).length === 0
}

function submit(): void {
  if (!validate()) return
  emit('save', {
    studentNumber: form.studentNumber.trim(),
    name: form.name.trim(),
    nationality: form.nationality.trim(),
    email: form.email.trim() || null,
    phone: form.phone.trim() || null,
    facultyId: Number(form.facultyId),
    programId: Number(form.programId),
    drawerId: drawer.value?.value ?? null,
    enrollmentYear: parseYear(form.enrollmentYear),
    graduationYear: parseYear(form.graduationYear),
    studentStatus: toStudentStatus(form.studentStatus),
    locationStatus: toLocationStatus(form.locationStatus),
  })
}
</script>

<template>
  <AppDialog
    :open="open"
    :title="isEditing ? t('students.form.editTitle') : t('students.form.createTitle')"
    size="lg"
    @close="emit('close')"
  >
    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <p v-if="lookupError" class="rounded-lg bg-danger/10 px-3 py-2 font-sans text-sm text-danger">
        {{ lookupError }}
      </p>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          :label="t('students.fields.studentNumber')"
          field-id="student-number"
          :error="errors.studentNumber"
        >
          <FormInput
            id="student-number"
            v-model="form.studentNumber"
            :placeholder="t('students.placeholders.studentNumber')"
          />
        </FormField>

        <FormField :label="t('students.fields.name')" field-id="student-name" :error="errors.name">
          <FormInput
            id="student-name"
            v-model="form.name"
            :placeholder="t('students.placeholders.name')"
          />
        </FormField>

        <FormField
          :label="t('students.fields.nationality')"
          field-id="student-nationality"
          :error="errors.nationality"
        >
          <FormInput
            id="student-nationality"
            v-model="form.nationality"
            :placeholder="t('students.placeholders.nationality')"
          />
        </FormField>

        <FormField
          :label="t('students.fields.email')"
          field-id="student-email"
          :error="errors.email"
        >
          <FormInput id="student-email" v-model="form.email" type="email" placeholder="—" />
        </FormField>

        <FormField
          :label="t('students.fields.phone')"
          field-id="student-phone"
          :error="errors.phone"
        >
          <FormInput id="student-phone" v-model="form.phone" placeholder="—" />
        </FormField>

        <FormField
          :label="t('students.fields.faculty')"
          field-id="student-faculty"
          :error="errors.facultyId"
        >
          <AppSelect
            :model-value="form.facultyId"
            :options="faculties"
            :placeholder="
              facultiesLoading ? t('students.states.loading') : t('students.placeholders.faculty')
            "
            placeholder-disabled
            @update:model-value="onFacultyChange"
          />
        </FormField>

        <FormField
          :label="t('students.fields.program')"
          field-id="student-program"
          :error="errors.programId"
        >
          <AppSelect
            v-model="form.programId"
            :options="programs"
            :placeholder="
              !form.facultyId
                ? t('students.placeholders.programBlocked')
                : programsLoading
                  ? t('students.states.loading')
                  : t('students.placeholders.program')
            "
            placeholder-disabled
          />
        </FormField>

        <FormField
          :label="t('students.fields.enrollmentYear')"
          field-id="student-enrollment"
          :error="errors.enrollmentYear"
        >
          <FormInput
            id="student-enrollment"
            v-model="form.enrollmentYear"
            type="number"
            placeholder="2020"
          />
        </FormField>

        <FormField
          :label="t('students.fields.graduationYear')"
          field-id="student-graduation"
          :error="errors.graduationYear"
        >
          <FormInput
            id="student-graduation"
            v-model="form.graduationYear"
            type="number"
            placeholder="—"
          />
        </FormField>

        <FormField :label="t('students.fields.studentStatus')" field-id="student-status">
          <AppSelect v-model="form.studentStatus" :options="statusOptions" />
        </FormField>

        <FormField :label="t('students.fields.locationStatus')" field-id="student-location">
          <AppSelect v-model="form.locationStatus" :options="locationOptions" />
        </FormField>

        <FormField :label="t('students.fields.drawer')" field-id="student-drawer">
          <AppAsyncSelect
            id="student-drawer"
            v-model="drawer"
            :search-fn="studentLookupsApi.searchDrawers"
            :placeholder="t('students.placeholders.drawer')"
            :loading-text="t('students.states.loading')"
            :empty-text="t('students.placeholders.drawerEmpty')"
            :error-text="t('students.errors.lookupFailed')"
            :min-chars-text="t('students.placeholders.drawerMinChars')"
            :clear-label="t('students.actions.clearDrawer')"
          />
        </FormField>
      </div>
    </form>

    <template #footer>
      <AppButton variant="ghost" @click="emit('close')">{{
        t('students.actions.cancel')
      }}</AppButton>
      <AppButton variant="primary" :loading="saving" @click="submit">
        {{ isEditing ? t('students.actions.save') : t('students.actions.create') }}
      </AppButton>
    </template>
  </AppDialog>
</template>
