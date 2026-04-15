<script setup lang="ts">
import { reactive, ref, watch, computed } from 'vue'
import { Eye, EyeOff } from 'lucide-vue-next'
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
    <p class="text-sm text-text-secondary font-sans mb-5">
      {{ isEdit ? 'Update user information and role assignment.' : 'Add a new user to the system and assign their role and permissions.' }}
    </p>

    <div class="flex flex-col gap-4">
      <!-- Full Name -->
      <div>
        <label class="block text-sm font-display font-medium text-text-primary mb-1">Full Name</label>
        <FormInput v-model="form.name" placeholder="Enter full name" />
        <p v-if="errors.name" class="mt-1 text-xs text-danger">{{ errors.name }}</p>
      </div>

      <!-- Email -->
      <div>
        <label class="block text-sm font-display font-medium text-text-primary mb-1">Email</label>
        <FormInput v-model="form.email" type="email" placeholder="User@limu.edu.ly" />
        <p v-if="errors.email" class="mt-1 text-xs text-danger">{{ errors.email }}</p>
      </div>

      <!-- Role + Faculty -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-display font-medium text-text-primary mb-1">Role</label>
          <select
            v-model="form.role"
            class="w-full bg-surface-card border border-border-input rounded-[9px] px-4 py-3 font-sans text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="" disabled>select role</option>
            <option v-for="r in ROLES" :key="r" :value="r">{{ r }}</option>
          </select>
          <p v-if="errors.role" class="mt-1 text-xs text-danger">{{ errors.role }}</p>
        </div>
        <div>
          <label class="block text-sm font-display font-medium text-text-primary mb-1">Faculty</label>
          <select
            v-model="form.faculty"
            class="w-full bg-surface-card border border-border-input rounded-[9px] px-4 py-3 font-sans text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">select faculty</option>
            <option v-for="f in FACULTIES" :key="f" :value="f">{{ f }}</option>
          </select>
        </div>
      </div>

      <!-- Default Password (create only) -->
      <div v-if="!isEdit">
        <label class="block text-sm font-display font-medium text-text-primary mb-1">Default Password</label>
        <div class="relative">
          <FormInput
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="••••••••"
          />
          <button
            type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
            @click="showPassword = !showPassword"
          >
            <EyeOff v-if="showPassword" class="w-4 h-4" />
            <Eye v-else class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Status toggle -->
      <div>
        <label class="block text-sm font-display font-medium text-text-primary mb-1">Status</label>
        <p class="text-xs text-text-muted font-sans mb-2">set user account as active or inactive</p>
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
            :class="form.status === 'Active' ? 'bg-primary' : 'bg-border'"
            @click="form.status = form.status === 'Active' ? 'Inactive' : 'Active'"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
              :class="form.status === 'Active' ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
          <span class="text-sm font-sans text-text-primary">{{ form.status }}</span>
        </div>
      </div>
    </div>

    <template #footer>
      <button
        type="button"
        class="px-5 py-2 rounded-lg border border-border text-sm font-display font-medium text-text-secondary hover:bg-surface transition-colors"
        @click="emit('close')"
      >
        Cancel
      </button>
      <button
        type="button"
        class="px-5 py-2 rounded-lg bg-primary text-white text-sm font-display font-medium hover:bg-primary-mid transition-colors"
        @click="submit"
      >
        {{ isEdit ? 'Update User' : 'Save User' }}
      </button>
    </template>
  </AppDialog>
</template>
