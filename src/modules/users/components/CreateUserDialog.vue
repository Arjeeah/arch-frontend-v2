<script setup lang="ts">
import { reactive, ref, watch, computed } from 'vue'
import { Eye, EyeOff, ChevronDown } from 'lucide-vue-next'
import AppDialog from '@/shared/components/AppDialog.vue'
import FormInput from '@/shared/components/FormInput.vue'
import type { User } from '../types'
import { ROLES, FACULTIES } from '../types'

const props = defineProps<{
  open: boolean
  user?: User | null
}>()

const emit = defineEmits<{
  close: []
  save: [data: Partial<User>]
}>()

const isEdit = computed(() => !!props.user)

const form = reactive({
  name: '',
  email: '',
  role: '',
  faculty: '',
  password: '',
  status: 'Active' as 'Active' | 'Inactive',
})

const showPassword = ref(false)
const errors = reactive({ name: '', email: '', role: '' })

watch(() => props.open, (open) => {
  if (!open) return
  if (props.user) {
    form.name = props.user.name
    form.email = props.user.email
    form.role = props.user.role
    form.faculty = props.user.faculties[0] ?? ''
    form.password = ''
    form.status = props.user.status
  } else {
    form.name = ''
    form.email = ''
    form.role = ''
    form.faculty = ''
    form.password = ''
    form.status = 'Active'
  }
  errors.name = ''
  errors.email = ''
  errors.role = ''
})

function validate() {
  errors.name = form.name.trim() ? '' : 'Full name is required'
  errors.email = form.email.trim() ? '' : 'Email is required'
  errors.role = form.role ? '' : 'Role is required'
  return !errors.name && !errors.email && !errors.role
}

function submit() {
  if (!validate()) return
  emit('save', {
    name: form.name.trim(),
    email: form.email.trim(),
    role: form.role,
    faculties: form.faculty ? [form.faculty] : [],
    status: form.status,
  })
}
</script>

<template>
  <AppDialog
    :open="open"
    :title="isEdit ? 'Edit User' : 'Create User'"
    size="md"
    @close="emit('close')"
  >
    <p class="text-sm font-sans text-[#6F6F6F] mb-5">
      {{ isEdit ? 'Update user information and role assignment.' : 'Add a new user to the system and assign their role and permissions.' }}
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

      <!-- Role + Faculty -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-base font-sans text-text-primary mb-[7px]">Role</label>
          <div class="relative">
            <select
              v-model="form.role"
              class="w-full h-[42px] pl-[18px] pr-10 bg-white border border-border-dropdown rounded-[8px] text-xs font-display font-medium text-[#313144] focus:outline-none appearance-none cursor-pointer"
              style="border-width: 1.3px"
            >
              <option value="" disabled>select role</option>
              <option v-for="r in ROLES" :key="r" :value="r">{{ r }}</option>
            </select>
            <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none text-[#313144]" />
          </div>
          <p v-if="errors.role" class="mt-1 text-xs text-danger">{{ errors.role }}</p>
        </div>
        <div>
          <label class="block text-base font-sans text-text-primary mb-[7px]">Faculty</label>
          <div class="relative">
            <select
              v-model="form.faculty"
              class="w-full h-[42px] pl-[18px] pr-10 bg-white border border-border-dropdown rounded-[8px] text-xs font-display font-medium text-[#313144] focus:outline-none appearance-none cursor-pointer"
              style="border-width: 1.3px"
            >
              <option value="">select faculty</option>
              <option v-for="f in FACULTIES" :key="f" :value="f">{{ f }}</option>
            </select>
            <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none text-[#313144]" />
          </div>
        </div>
      </div>

      <!-- Default Password (create only) -->
      <div v-if="!isEdit">
        <label class="block text-base font-sans text-text-primary mb-[10px]">Default Password</label>
        <div class="flex items-center gap-[14px]">
          <input
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="••••••••"
            class="flex-1 h-[38px] bg-white border border-border-input rounded-[5px] px-4 font-sans text-sm text-text-primary placeholder:text-text-placeholder placeholder:font-display placeholder:font-light focus:outline-none focus:border-primary"
          />
          <button
            type="button"
            class="shrink-0 w-[34px] h-[29px] bg-[#ACC6E8] border border-border-input rounded-[5px] flex items-center justify-center"
            @click="showPassword = !showPassword"
          >
            <EyeOff v-if="showPassword" class="w-3.5 h-3.5 text-[#71839B]" />
            <Eye v-else class="w-3.5 h-3.5 text-[#71839B]" />
          </button>
        </div>
      </div>

      <!-- Status -->
      <div>
        <label class="block text-base font-sans text-text-primary mb-1">Status</label>
        <div class="flex items-center justify-between">
          <p class="text-sm font-sans text-[#6F6F6F]">set user account as active or inactive</p>
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
        {{ isEdit ? 'Update User' : 'Save User' }}
      </button>
    </template>
  </AppDialog>
</template>
