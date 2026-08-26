<script setup lang="ts">
import { reactive, ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Eye, EyeOff } from 'lucide-vue-next'
import AppDialog from '@/shared/components/AppDialog.vue'
import AppSelect from '@/shared/components/AppSelect.vue'
import FormInput from '@/shared/components/FormInput.vue'
import { ROLES } from '../types'
import type { User, UserInput, UserRole, UserStatus } from '../types'
import FacultyChipPicker from './FacultyChipPicker.vue'

const props = defineProps<{
  open: boolean
  user?: User | null
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  close: []
  save: [data: UserInput]
}>()

const { t } = useI18n()

const isEdit = computed(() => !!props.user)

const form = reactive({
  name: '',
  email: '',
  role: '' as UserRole | '',
  password: '',
  status: 'Active' as UserStatus,
  facultyIds: [] as number[],
})

const showPassword = ref(false)
const errors = reactive({ name: '', email: '', role: '', password: '', facultyIds: '' })

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.name = props.user?.name ?? ''
    form.email = props.user?.email ?? ''
    form.role = props.user?.role ?? ''
    form.password = ''
    form.status = props.user?.status ?? 'Active'
    form.facultyIds = props.user?.faculties.map((f) => f.id) ?? []
    errors.name = ''
    errors.email = ''
    errors.role = ''
    errors.password = ''
    errors.facultyIds = ''
  },
)

function validate() {
  errors.name = form.name.trim() ? '' : t('users.dialog.errors.nameRequired')
  errors.email = form.email.trim() ? '' : t('users.dialog.errors.emailRequired')
  errors.role = form.role ? '' : t('users.dialog.errors.roleRequired')
  // The backend requires a password when creating; on edit an empty field
  // means "leave the current password alone".
  errors.password = isEdit.value || form.password ? '' : t('users.dialog.errors.passwordRequired')
  // Required (min 1) on create. On edit an empty selection is dropped from the
  // payload by `usersApi.toPayload`, which leaves the backend's existing
  // assignment untouched — see the note there for why `[]` must never be sent.
  errors.facultyIds =
    isEdit.value || form.facultyIds.length ? '' : t('users.dialog.errors.facultyRequired')
  return !errors.name && !errors.email && !errors.role && !errors.password && !errors.facultyIds
}

function submit() {
  if (!validate()) return
  const role = form.role
  if (!role) return

  const payload: UserInput = {
    name: form.name.trim(),
    email: form.email.trim(),
    role,
    status: form.status,
    facultyIds: form.facultyIds,
  }
  // The API layer also sends this as password_confirmation.
  if (form.password) payload.password = form.password

  emit('save', payload)
}

const roleOptions = computed(() =>
  ROLES.map((r) => ({ value: r.value, label: roleLabelT(r.value) })),
)

/** `roleLabel()` from `types.ts` returns an English fallback label; route it through i18n instead. */
function roleLabelT(role: UserRole): string {
  return t(`common.roles.${role}`)
}
</script>

<template>
  <AppDialog
    :open="open"
    :title="isEdit ? t('users.dialog.editTitle') : t('users.dialog.createTitle')"
    size="md"
    @close="emit('close')"
  >
    <p class="text-sm font-sans text-[#6F6F6F] mb-5">
      {{ isEdit ? t('users.dialog.editSubtitle') : t('users.dialog.createSubtitle') }}
    </p>

    <div class="flex flex-col gap-4">
      <!-- Full Name -->
      <div>
        <label class="block text-base font-sans text-text-primary mb-[7px]">{{
          t('users.dialog.nameLabel')
        }}</label>
        <FormInput v-model="form.name" :placeholder="t('users.dialog.namePlaceholder')" />
        <p v-if="errors.name" class="mt-1 text-xs text-danger">{{ errors.name }}</p>
      </div>

      <!-- Email -->
      <div>
        <label class="block text-base font-sans text-text-primary mb-[7px]">{{
          t('users.dialog.emailLabel')
        }}</label>
        <FormInput
          v-model="form.email"
          type="email"
          :placeholder="t('users.dialog.emailPlaceholder')"
        />
        <p v-if="errors.email" class="mt-1 text-xs text-danger">{{ errors.email }}</p>
      </div>

      <!-- Role -->
      <div>
        <label class="block text-base font-sans text-text-primary mb-[7px]">{{
          t('users.dialog.roleLabel')
        }}</label>
        <AppSelect
          v-model="form.role"
          :options="roleOptions"
          :placeholder="t('users.dialog.rolePlaceholder')"
          :placeholder-disabled="true"
        />
        <p v-if="errors.role" class="mt-1 text-xs text-danger">{{ errors.role }}</p>
      </div>

      <!-- Faculties -->
      <div>
        <label class="block text-base font-sans text-text-primary mb-[7px]">{{
          t('users.dialog.facultiesLabel')
        }}</label>
        <FacultyChipPicker v-model="form.facultyIds" />
        <p v-if="errors.facultyIds" class="mt-1 text-xs text-danger">{{ errors.facultyIds }}</p>
        <p v-else-if="isEdit" class="mt-1 text-xs text-[#6F6F6F]">
          {{ t('users.dialog.facultiesHintEdit') }}
        </p>
      </div>

      <!-- Default Password (create only) -->
      <div v-if="!isEdit">
        <label class="block text-base font-sans text-text-primary mb-[10px]">{{
          t('users.dialog.passwordLabel')
        }}</label>
        <div class="flex items-center gap-[14px]">
          <input
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="••••••••"
            class="flex-1 h-[38px] bg-white border border-border-input rounded-[5px] px-4 font-sans text-sm text-text-primary placeholder:text-text-placeholder placeholder:font-display placeholder:font-light focus:outline-none focus:border-primary"
          />
          <button
            type="button"
            class="shrink-0 w-[34px] h-[29px] bg-primary-light border border-border-input rounded-[5px] flex items-center justify-center"
            :aria-label="
              showPassword ? t('users.dialog.hidePassword') : t('users.dialog.showPassword')
            "
            @click="showPassword = !showPassword"
          >
            <EyeOff v-if="showPassword" class="w-3.5 h-3.5 text-text-secondary" />
            <Eye v-else class="w-3.5 h-3.5 text-text-secondary" />
          </button>
        </div>
        <p v-if="errors.password" class="mt-1 text-xs text-danger">{{ errors.password }}</p>
      </div>

      <!-- Status -->
      <div>
        <label class="block text-base font-sans text-text-primary mb-1">{{
          t('users.dialog.statusLabel')
        }}</label>
        <div class="flex items-center justify-between">
          <p class="text-sm font-sans text-[#6F6F6F]">{{ t('users.dialog.statusHelp') }}</p>
          <div class="flex items-center gap-3 shrink-0">
            <span class="text-sm font-sans text-text-secondary">{{
              form.status === 'Active' ? t('users.status.active') : t('users.status.inactive')
            }}</span>
            <button
              type="button"
              class="relative inline-flex h-[25px] w-[46px] items-center rounded-[16px] transition-colors focus:outline-none"
              :class="form.status === 'Active' ? 'bg-primary-light' : 'bg-border'"
              @click="form.status = form.status === 'Active' ? 'Inactive' : 'Active'"
            >
              <!-- Logical `start-*` inset, not `translate-x-*`: under `dir="rtl"`
                   the flex child starts at the right edge and a positive
                   translate pushes it further right, so the knob rendered
                   outside the track in both states. Same fix as
                   `RoleEnableMapField` / `SettingsGroupForm`. -->
              <span
                class="absolute top-[3px] h-[19px] w-[19px] rounded-[16px] bg-white shadow-[0px_3px_7px_rgba(0,0,0,0.12)] transition-all"
                :class="form.status === 'Active' ? 'start-[24px]' : 'start-[2px]'"
              />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Message -->
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
        {{ t('users.dialog.cancel') }}
      </button>
      <button
        type="button"
        class="px-[10.6px] py-[7px] rounded-[4px] bg-primary-mid text-sm font-sans font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50 flex items-center gap-2"
        :disabled="loading"
        @click="submit"
      >
        {{ isEdit ? t('users.dialog.update') : t('users.dialog.save') }}
      </button>
    </template>
  </AppDialog>
</template>
