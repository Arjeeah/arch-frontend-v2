<script setup lang="ts">
import { reactive, ref, watch, computed } from 'vue'
import { Eye, EyeOff } from 'lucide-vue-next'
import AppDialog from '@/shared/components/AppDialog.vue'
import AppSelect from '@/shared/components/AppSelect.vue'
import FormInput from '@/shared/components/FormInput.vue'
import { ROLES } from '../types'
import type { User, UserInput, UserRole, UserStatus } from '../types'

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

const isEdit = computed(() => !!props.user)

const form = reactive({
  name: '',
  email: '',
  role: '' as UserRole | '',
  password: '',
  status: 'Active' as UserStatus,
})

const showPassword = ref(false)
const errors = reactive({ name: '', email: '', role: '', password: '' })

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.name = props.user?.name ?? ''
    form.email = props.user?.email ?? ''
    form.role = props.user?.role ?? ''
    form.password = ''
    form.status = props.user?.status ?? 'Active'
    errors.name = ''
    errors.email = ''
    errors.role = ''
    errors.password = ''
  },
)

function validate() {
  errors.name = form.name.trim() ? '' : 'Full name is required'
  errors.email = form.email.trim() ? '' : 'Email is required'
  errors.role = form.role ? '' : 'Role is required'
  // The backend requires a password when creating; on edit an empty field
  // means "leave the current password alone".
  errors.password = isEdit.value || form.password ? '' : 'Password is required'
  return !errors.name && !errors.email && !errors.role && !errors.password
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
  }
  // The API layer also sends this as password_confirmation.
  if (form.password) payload.password = form.password

  emit('save', payload)
}

const roleOptions = ROLES.map((r) => ({ value: r.value, label: r.label }))
</script>

<template>
  <AppDialog
    :open="open"
    :title="isEdit ? 'Edit User' : 'Create User'"
    size="md"
    @close="emit('close')"
  >
    <p class="text-sm font-sans text-[#6F6F6F] mb-5">
      {{
        isEdit
          ? 'Update user information and role assignment.'
          : 'Add a new user to the system and assign their role and permissions.'
      }}
    </p>

    <div class="flex flex-col gap-4">
      <!-- Full Name -->
      <div>
        <label class="block text-base font-sans text-text-primary mb-[7px]">Full Name</label>
        <FormInput v-model="form.name" placeholder="Enter full name" />
        <p v-if="errors.name" class="mt-1 text-xs text-danger">{{ errors.name }}</p>
      </div>

      <!-- Email -->
      <div>
        <label class="block text-base font-sans text-text-primary mb-[7px]">Email</label>
        <FormInput v-model="form.email" type="email" placeholder="User@limu.edu.ly" />
        <p v-if="errors.email" class="mt-1 text-xs text-danger">{{ errors.email }}</p>
      </div>

      <!-- Role -->
      <div>
        <label class="block text-base font-sans text-text-primary mb-[7px]">Role</label>
        <AppSelect
          v-model="form.role"
          :options="roleOptions"
          placeholder="Select role"
          :placeholder-disabled="true"
        />
        <p v-if="errors.role" class="mt-1 text-xs text-danger">{{ errors.role }}</p>
      </div>

      <!-- Default Password (create only) -->
      <div v-if="!isEdit">
        <label class="block text-base font-sans text-text-primary mb-[10px]"
          >Default Password</label
        >
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
        <label class="block text-base font-sans text-text-primary mb-1">Status</label>
        <div class="flex items-center justify-between">
          <p class="text-sm font-sans text-[#6F6F6F]">set user account as active or inactive</p>
          <div class="flex items-center gap-3 shrink-0">
            <span class="text-sm font-sans text-text-secondary">{{ form.status }}</span>
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
        Cancel
      </button>
      <button
        type="button"
        class="px-[10.6px] py-[7px] rounded-[4px] bg-primary-mid text-sm font-sans font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50 flex items-center gap-2"
        :disabled="loading"
        @click="submit"
      >
        {{ isEdit ? 'Update User' : 'Save User' }}
      </button>
    </template>
  </AppDialog>
</template>
