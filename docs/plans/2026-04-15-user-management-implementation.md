# User Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the Super Admin User Management feature — list page with search/filter/pagination, view user detail page, and create/edit dialog — all using client-side mock data.

**Architecture:** New `src/modules/users/` module. Types defined in `types/index.ts`. All mock data in `data/mockUsers.ts`. Pages compose focused child components. `CreateUserDialog` wraps the existing `AppDialog`. All filtering and pagination is client-side (computed refs on the mock array). No API calls.

**Tech Stack:** Vue 3 Composition API (`<script setup>`), Tailwind CSS v3, Lucide Vue Next, existing `AppDialog` + `FormInput` shared components.

---

## Task 1: Types + Mock Data

**Files:**
- Create: `src/modules/users/types/index.ts`
- Create: `src/modules/users/data/mockUsers.ts`

**Step 1: Create types**

```ts
// src/modules/users/types/index.ts

export interface Permission {
  label: string
  state: 'allowed' | 'warning' | 'denied'
}

export interface Activity {
  timestamp: string
  action: string
  details: string
}

export interface User {
  id: number
  name: string
  email: string
  role: string
  faculties: string[]
  status: 'Active' | 'Inactive'
  lastLogin: string
  createdAt: string
  permissions: Permission[]
  recentActivity: Activity[]
}

export const ROLES = ['Super admin', 'Admin', 'Archivist', 'Faculty staff'] as const
export const FACULTIES = ['IT', 'Business', 'Architecture', 'Medicine', 'Law', 'Engineering'] as const
```

**Step 2: Create mock data**

```ts
// src/modules/users/data/mockUsers.ts
import type { User } from '../types'

const archivistPermissions = [
  { label: 'View all files', state: 'allowed' as const },
  { label: 'Process Borrowing', state: 'allowed' as const },
  { label: 'Delete Documents', state: 'allowed' as const },
  { label: 'Label', state: 'allowed' as const },
  { label: 'Override', state: 'warning' as const },
  { label: 'Label', state: 'allowed' as const },
  { label: 'Manage User', state: 'denied' as const },
  { label: 'Manage Backup', state: 'denied' as const },
  { label: 'Manage Settings', state: 'denied' as const },
  { label: 'Export Data', state: 'denied' as const },
  { label: 'Delete files', state: 'denied' as const },
]

const adminPermissions = [
  { label: 'View all files', state: 'allowed' as const },
  { label: 'Process Borrowing', state: 'allowed' as const },
  { label: 'Delete Documents', state: 'allowed' as const },
  { label: 'Label', state: 'allowed' as const },
  { label: 'Override', state: 'allowed' as const },
  { label: 'Label', state: 'allowed' as const },
  { label: 'Manage User', state: 'allowed' as const },
  { label: 'Manage Backup', state: 'warning' as const },
  { label: 'Manage Settings', state: 'denied' as const },
  { label: 'Export Data', state: 'denied' as const },
  { label: 'Delete files', state: 'denied' as const },
]

const superAdminPermissions = [
  { label: 'View all files', state: 'allowed' as const },
  { label: 'Process Borrowing', state: 'allowed' as const },
  { label: 'Delete Documents', state: 'allowed' as const },
  { label: 'Label', state: 'allowed' as const },
  { label: 'Override', state: 'allowed' as const },
  { label: 'Label', state: 'allowed' as const },
  { label: 'Manage User', state: 'allowed' as const },
  { label: 'Manage Backup', state: 'allowed' as const },
  { label: 'Manage Settings', state: 'allowed' as const },
  { label: 'Export Data', state: 'allowed' as const },
  { label: 'Delete files', state: 'allowed' as const },
]

const commonActivity = [
  { timestamp: 'Jan 19, 10:15 AM', action: 'file.view', details: 'viewed file #3724' },
  { timestamp: 'Jan 9, 11:05 AM', action: 'document.upload', details: 'upload passport scan to file #3081' },
  { timestamp: 'Jan 19, 10:15 AM', action: 'file.view', details: 'viewed file #3100' },
  { timestamp: 'Jan 18, 2:30 PM', action: 'file.view', details: 'viewed file #2990' },
  { timestamp: 'Jan 17, 9:00 AM', action: 'document.upload', details: 'uploaded ID scan' },
]

export const mockUsers: User[] = [
  { id: 1, name: 'Ahmed Ali', email: 'a@limu.edu.ly', role: 'Archivist', faculties: [], status: 'Active', lastLogin: 'Jan 19, 2026', createdAt: 'Dec 1, 2025', permissions: archivistPermissions, recentActivity: commonActivity },
  { id: 2, name: 'Nour Mohammed', email: 'nour@limu.edu.ly', role: 'Admin', faculties: ['IT'], status: 'Active', lastLogin: 'Jan 18, 2026', createdAt: 'Nov 15, 2025', permissions: adminPermissions, recentActivity: commonActivity },
  { id: 3, name: 'Sara Ahmed Ali', email: 'sara@limu.edu.ly', role: 'Faculty staff', faculties: ['Business', 'Engineering'], status: 'Inactive', lastLogin: 'Jan 10, 2026', createdAt: 'Dec 19, 2025', permissions: archivistPermissions, recentActivity: commonActivity },
  { id: 4, name: 'Mohammed Hassan', email: 'mo@limu.edu.ly', role: 'Admin', faculties: ['Architecture'], status: 'Active', lastLogin: 'Jan 19, 2026', createdAt: 'Oct 5, 2025', permissions: adminPermissions, recentActivity: commonActivity },
  { id: 5, name: 'Aya Alaa', email: 'aya@limu.edu.ly', role: 'Super admin', faculties: ['Medicine'], status: 'Active', lastLogin: 'Jan 20, 2026', createdAt: 'Sep 1, 2025', permissions: superAdminPermissions, recentActivity: commonActivity },
  { id: 6, name: 'Ehab Khalid', email: '21@limu.edu.ly', role: 'Archivist', faculties: ['Law'], status: 'Active', lastLogin: 'Jan 15, 2026', createdAt: 'Dec 10, 2025', permissions: archivistPermissions, recentActivity: commonActivity },
  { id: 7, name: 'Fatima Omar', email: 'fatima@limu.edu.ly', role: 'Faculty staff', faculties: ['IT', 'Business'], status: 'Active', lastLogin: 'Jan 17, 2026', createdAt: 'Nov 20, 2025', permissions: archivistPermissions, recentActivity: commonActivity },
  { id: 8, name: 'Khalid Mansour', email: 'khalid@limu.edu.ly', role: 'Archivist', faculties: ['Engineering'], status: 'Inactive', lastLogin: 'Dec 30, 2025', createdAt: 'Aug 15, 2025', permissions: archivistPermissions, recentActivity: commonActivity },
  { id: 9, name: 'Layla Ibrahim', email: 'layla@limu.edu.ly', role: 'Admin', faculties: ['Medicine', 'Law'], status: 'Active', lastLogin: 'Jan 19, 2026', createdAt: 'Oct 20, 2025', permissions: adminPermissions, recentActivity: commonActivity },
  { id: 10, name: 'Omar Faris', email: 'omar@limu.edu.ly', role: 'Faculty staff', faculties: ['Architecture'], status: 'Active', lastLogin: 'Jan 16, 2026', createdAt: 'Dec 5, 2025', permissions: archivistPermissions, recentActivity: commonActivity },
  { id: 11, name: 'Rania Saleh', email: 'rania@limu.edu.ly', role: 'Archivist', faculties: ['IT'], status: 'Active', lastLogin: 'Jan 14, 2026', createdAt: 'Nov 1, 2025', permissions: archivistPermissions, recentActivity: commonActivity },
  { id: 12, name: 'Tarek Yousef', email: 'tarek@limu.edu.ly', role: 'Admin', faculties: ['Business'], status: 'Inactive', lastLogin: 'Jan 5, 2026', createdAt: 'Sep 10, 2025', permissions: adminPermissions, recentActivity: commonActivity },
  { id: 13, name: 'Salma Nasser', email: 'salma@limu.edu.ly', role: 'Faculty staff', faculties: ['Law', 'Engineering'], status: 'Active', lastLogin: 'Jan 18, 2026', createdAt: 'Dec 15, 2025', permissions: archivistPermissions, recentActivity: commonActivity },
  { id: 14, name: 'Youssef Kamal', email: 'youssef@limu.edu.ly', role: 'Archivist', faculties: ['Medicine'], status: 'Active', lastLogin: 'Jan 12, 2026', createdAt: 'Oct 30, 2025', permissions: archivistPermissions, recentActivity: commonActivity },
  { id: 15, name: 'Hana Malik', email: 'hana@limu.edu.ly', role: 'Super admin', faculties: ['Architecture', 'IT'], status: 'Active', lastLogin: 'Jan 20, 2026', createdAt: 'Aug 1, 2025', permissions: superAdminPermissions, recentActivity: commonActivity },
]
```

**Step 3: Build check**

```bash
cd /Users/arjytalzwy/Desktop/UNI/google/arch-frontend-v2
npm run build 2>&1 | tail -10
```

Expected: zero errors.

**Step 4: Commit**

```bash
git add src/modules/users/types/index.ts src/modules/users/data/mockUsers.ts
git commit -m "feat(users): add types and mock data"
```

---

## Task 2: UserStatusBadge

**Files:**
- Create: `src/modules/users/components/UserStatusBadge.vue`

**Step 1: Create the component**

```vue
<!-- src/modules/users/components/UserStatusBadge.vue -->
<script setup lang="ts">
defineProps<{ status: 'Active' | 'Inactive' }>()
</script>

<template>
  <span
    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-display font-medium"
    :class="status === 'Active'
      ? 'bg-success-bg text-success-text'
      : 'bg-inactive-bg text-inactive-text'"
  >
    {{ status }}
  </span>
</template>
```

**Step 2: Build check**

```bash
npm run build 2>&1 | tail -10
```

**Step 3: Commit**

```bash
git add src/modules/users/components/UserStatusBadge.vue
git commit -m "feat(users): add UserStatusBadge component"
```

---

## Task 3: UserTable

**Files:**
- Create: `src/modules/users/components/UserTable.vue`

**Step 1: Create the component**

```vue
<!-- src/modules/users/components/UserTable.vue -->
<script setup lang="ts">
import { useRouter } from 'vue-router'
import { SquarePen, Ban } from 'lucide-vue-next'
import UserStatusBadge from './UserStatusBadge.vue'
import type { User } from '../types'

defineProps<{
  users: User[]
  loading?: boolean
}>()

const emit = defineEmits<{
  edit: [user: User]
  delete: [user: User]
}>()

const router = useRouter()

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
</script>

<template>
  <div class="bg-white rounded-[10px] border border-border overflow-hidden shadow-sm">
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-surface-table border-b border-border">
          <tr>
            <th class="text-left px-5 py-3 text-xs font-display font-medium text-text-muted">Name</th>
            <th class="text-left px-5 py-3 text-xs font-display font-medium text-text-muted">Email</th>
            <th class="text-left px-5 py-3 text-xs font-display font-medium text-text-muted">Role</th>
            <th class="text-left px-5 py-3 text-xs font-display font-medium text-text-muted">Faculty</th>
            <th class="text-left px-5 py-3 text-xs font-display font-medium text-text-muted">Status</th>
            <th class="text-left px-5 py-3 text-xs font-display font-medium text-text-muted">Last Login</th>
            <th class="text-left px-5 py-3 text-xs font-display font-medium text-text-muted">Created At</th>
            <th class="text-left px-5 py-3 text-xs font-display font-medium text-text-muted">Actions</th>
          </tr>
        </thead>
        <tbody>
          <!-- Loading skeleton -->
          <template v-if="loading">
            <tr v-for="i in 6" :key="i" class="border-t border-border">
              <td v-for="j in 8" :key="j" class="px-5 py-4">
                <div class="h-4 bg-surface rounded animate-pulse" :style="{ width: j === 1 ? '120px' : j === 8 ? '60px' : '80px' }" />
              </td>
            </tr>
          </template>

          <!-- Data rows -->
          <template v-else>
            <tr
              v-for="user in users"
              :key="user.id"
              class="border-t border-border hover:bg-surface transition-colors"
            >
              <td class="px-5 py-4">
                <button
                  class="text-sm font-sans font-medium text-text-primary hover:text-primary transition-colors text-left"
                  @click="router.push(`/users/${user.id}`)"
                >
                  {{ user.name }}
                </button>
              </td>
              <td class="px-5 py-4 text-sm text-text-secondary font-sans">{{ user.email }}</td>
              <td class="px-5 py-4 text-sm text-text-primary font-sans">{{ user.role }}</td>
              <td class="px-5 py-4 text-sm text-text-secondary font-sans">
                {{ user.faculties.length ? user.faculties.join(', ') : '-' }}
              </td>
              <td class="px-5 py-4">
                <UserStatusBadge :status="user.status" />
              </td>
              <td class="px-5 py-4 text-sm text-text-muted font-sans">{{ user.lastLogin }}</td>
              <td class="px-5 py-4 text-sm text-text-muted font-sans">{{ user.createdAt }}</td>
              <td class="px-5 py-4">
                <div class="flex items-center gap-2">
                  <button
                    class="text-primary hover:text-primary-mid transition-colors"
                    title="Edit user"
                    @click="emit('edit', user)"
                  >
                    <SquarePen class="w-5 h-5" />
                  </button>
                  <button
                    class="text-danger hover:opacity-70 transition-opacity"
                    title="Delete user"
                    @click="emit('delete', user)"
                  >
                    <Ban class="w-5 h-5" />
                  </button>
                </div>
              </td>
            </tr>

            <!-- Empty state -->
            <tr v-if="!users.length">
              <td colspan="8" class="px-5 py-12 text-center text-sm text-text-muted font-sans">
                No users match the current filters.
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
```

**Step 2: Build check**

```bash
npm run build 2>&1 | tail -10
```

**Step 3: Commit**

```bash
git add src/modules/users/components/UserTable.vue
git commit -m "feat(users): add UserTable component"
```

---

## Task 4: UserPermissionsCard + UserActivityCard

**Files:**
- Create: `src/modules/users/components/UserPermissionsCard.vue`
- Create: `src/modules/users/components/UserActivityCard.vue`

**Step 1: Create UserPermissionsCard**

```vue
<!-- src/modules/users/components/UserPermissionsCard.vue -->
<script setup lang="ts">
import { ShieldCheck, Check, AlertTriangle, X } from 'lucide-vue-next'
import type { Permission } from '../types'

defineProps<{ permissions: Permission[] }>()
</script>

<template>
  <div class="bg-white rounded-[10px] border border-border p-5 shadow-sm">
    <h3 class="flex items-center gap-2 text-sm font-display font-medium text-primary mb-4">
      <ShieldCheck class="w-4 h-4" />
      Permission Based On Role
    </h3>

    <div class="grid grid-cols-2 gap-2">
      <div
        v-for="(perm, i) in permissions"
        :key="i"
        class="flex items-center gap-2 px-3 py-2 rounded text-sm font-sans"
        :class="{
          'bg-success-bg text-success-text': perm.state === 'allowed',
          'bg-warning/10 text-warning': perm.state === 'warning',
          'bg-surface text-text-muted': perm.state === 'denied',
        }"
      >
        <Check v-if="perm.state === 'allowed'" class="w-4 h-4 shrink-0" />
        <AlertTriangle v-else-if="perm.state === 'warning'" class="w-4 h-4 shrink-0" />
        <X v-else class="w-4 h-4 shrink-0" />
        <span>{{ perm.label }}</span>
      </div>
    </div>

    <!-- Legend -->
    <div class="flex items-center gap-4 mt-4 text-xs text-text-muted font-sans">
      <span class="flex items-center gap-1">
        <span class="w-3 h-3 rounded-sm bg-success-bg inline-block" />
        Allowed
      </span>
      <span class="flex items-center gap-1">
        <span class="w-3 h-3 rounded-sm bg-warning/10 inline-block" />
        With warning
      </span>
      <span class="flex items-center gap-1">
        <span class="w-3 h-3 rounded-sm bg-surface inline-block" />
        Denied
      </span>
    </div>
  </div>
</template>
```

**Step 2: Create UserActivityCard**

```vue
<!-- src/modules/users/components/UserActivityCard.vue -->
<script setup lang="ts">
import { Clock } from 'lucide-vue-next'
import type { Activity } from '../types'

defineProps<{ activities: Activity[] }>()

const actionColor: Record<string, string> = {
  'file.view': 'text-success',
  'document.upload': 'text-primary',
}
</script>

<template>
  <div class="bg-white rounded-[10px] border border-border shadow-sm overflow-hidden">
    <div class="px-5 py-4 border-b border-border flex items-center gap-2">
      <Clock class="w-4 h-4 text-text-secondary" />
      <h3 class="text-sm font-display font-medium text-text-primary">Recent Activities (Last 5 Actions)</h3>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-surface-table">
          <tr>
            <th class="text-left px-5 py-3 text-xs font-display font-medium text-text-muted">Timestamp</th>
            <th class="text-left px-5 py-3 text-xs font-display font-medium text-text-muted">Action</th>
            <th class="text-left px-5 py-3 text-xs font-display font-medium text-text-muted">Details</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(activity, i) in activities.slice(0, 5)"
            :key="i"
            class="border-t border-border"
          >
            <td class="px-5 py-3 text-sm text-text-secondary font-sans whitespace-nowrap">{{ activity.timestamp }}</td>
            <td class="px-5 py-3 text-sm font-sans font-medium" :class="actionColor[activity.action] ?? 'text-text-primary'">
              {{ activity.action }}
            </td>
            <td class="px-5 py-3 text-sm text-text-primary font-sans">{{ activity.details }}</td>
          </tr>
          <tr v-if="!activities.length">
            <td colspan="3" class="px-5 py-8 text-center text-sm text-text-muted font-sans">No recent activity.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
```

**Step 3: Build check**

```bash
npm run build 2>&1 | tail -10
```

**Step 4: Commit**

```bash
git add src/modules/users/components/UserPermissionsCard.vue src/modules/users/components/UserActivityCard.vue
git commit -m "feat(users): add UserPermissionsCard and UserActivityCard"
```

---

## Task 5: CreateUserDialog

**Files:**
- Create: `src/modules/users/components/CreateUserDialog.vue`

**Step 1: Create the component**

```vue
<!-- src/modules/users/components/CreateUserDialog.vue -->
<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
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

<script lang="ts">
import { computed } from 'vue'
</script>

<template>
  <AppDialog
    :open="open"
    :title="isEdit ? 'Edit User' : 'Create User'"
    size="md"
    @close="emit('close')"
  >
    <!-- Subtitle -->
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
```

**Step 2: Build check**

```bash
npm run build 2>&1 | tail -10
```

**Step 3: Commit**

```bash
git add src/modules/users/components/CreateUserDialog.vue
git commit -m "feat(users): add CreateUserDialog component"
```

---

## Task 6: UserListPage + router

**Files:**
- Create: `src/modules/users/pages/UserListPage.vue`
- Modify: `src/app/router/index.ts`

**Step 1: Create UserListPage**

```vue
<!-- src/modules/users/pages/UserListPage.vue -->
<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { Search, UserPlus } from 'lucide-vue-next'
import UserTable from '../components/UserTable.vue'
import UserStatusBadge from '../components/UserStatusBadge.vue'
import CreateUserDialog from '../components/CreateUserDialog.vue'
import AppDialog from '@/shared/components/AppDialog.vue'
import { mockUsers } from '../data/mockUsers'
import { ROLES, FACULTIES } from '../types'
import type { User } from '../types'

// Local reactive copy so add/edit/delete update the UI
const users = ref<User[]>([...mockUsers])

// Filters
const search = ref('')
const roleFilter = ref('')
const statusFilter = ref('')
const facultyFilter = ref('')
const currentPage = ref(1)
const PER_PAGE = 10

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return users.value.filter(u => {
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    const matchRole = !roleFilter.value || u.role === roleFilter.value
    const matchStatus = !statusFilter.value || u.status === statusFilter.value
    const matchFaculty = !facultyFilter.value || u.faculties.includes(facultyFilter.value)
    return matchSearch && matchRole && matchStatus && matchFaculty
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / PER_PAGE)))
const paginated = computed(() => {
  const start = (currentPage.value - 1) * PER_PAGE
  return filtered.value.slice(start, start + PER_PAGE)
})

function resetPage() { currentPage.value = 1 }

// Fake loading on mount
const loading = ref(true)
setTimeout(() => { loading.value = false }, 300)

// Create/Edit dialog
const dialogOpen = ref(false)
const editingUser = ref<User | null>(null)

function openCreate() { editingUser.value = null; dialogOpen.value = true }
function openEdit(user: User) { editingUser.value = user; dialogOpen.value = true }

function handleSave(data: Partial<User>) {
  if (editingUser.value) {
    const idx = users.value.findIndex(u => u.id === editingUser.value!.id)
    if (idx !== -1) users.value[idx] = { ...users.value[idx], ...data }
  } else {
    const newId = Math.max(...users.value.map(u => u.id)) + 1
    users.value.unshift({ id: newId, permissions: [], recentActivity: [], lastLogin: '-', createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), ...data } as User)
  }
  dialogOpen.value = false
}

// Delete dialog
const deleteDialogOpen = ref(false)
const deletingUser = ref<User | null>(null)

function openDelete(user: User) { deletingUser.value = user; deleteDialogOpen.value = true }
function confirmDelete() {
  if (deletingUser.value) users.value = users.value.filter(u => u.id !== deletingUser.value!.id)
  deleteDialogOpen.value = false
}

// Pagination helpers
function visiblePages() {
  const total = totalPages.value
  const cur = currentPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (cur <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (cur >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', cur - 1, cur, cur + 1, '...', total]
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-display font-semibold text-text-primary">User Management</h1>
        <p class="text-sm text-text-secondary font-sans mt-0.5">Manage system users and their roles</p>
      </div>
      <button
        class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-display font-medium hover:bg-primary-mid transition-colors"
        @click="openCreate"
      >
        <UserPlus class="w-4 h-4" />
        Add User
      </button>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-3 flex-wrap">
      <div class="relative flex-1 min-w-[200px]">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          v-model="search"
          type="text"
          placeholder="Search"
          class="w-full pl-9 pr-4 py-2 bg-white border border-border rounded-lg text-sm font-sans text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          @input="resetPage"
        />
      </div>
      <select
        v-model="roleFilter"
        class="px-4 py-2 bg-white border border-border rounded-lg text-sm font-sans text-text-primary focus:outline-none focus:border-primary"
        @change="resetPage"
      >
        <option value="">All Roles</option>
        <option v-for="r in ROLES" :key="r" :value="r">{{ r }}</option>
      </select>
      <select
        v-model="statusFilter"
        class="px-4 py-2 bg-white border border-border rounded-lg text-sm font-sans text-text-primary focus:outline-none focus:border-primary"
        @change="resetPage"
      >
        <option value="">All Status</option>
        <option value="Active">Active</option>
        <option value="Inactive">Inactive</option>
      </select>
      <select
        v-model="facultyFilter"
        class="px-4 py-2 bg-white border border-border rounded-lg text-sm font-sans text-text-primary focus:outline-none focus:border-primary"
        @change="resetPage"
      >
        <option value="">All Faculties</option>
        <option v-for="f in FACULTIES" :key="f" :value="f">{{ f }}</option>
      </select>
    </div>

    <!-- Table -->
    <UserTable
      :users="paginated"
      :loading="loading"
      @edit="openEdit"
      @delete="openDelete"
    />

    <!-- Pagination -->
    <div v-if="!loading && totalPages > 1" class="flex items-center justify-center gap-1">
      <button
        class="w-8 h-8 flex items-center justify-center rounded border border-border text-text-secondary hover:bg-surface disabled:opacity-40"
        :disabled="currentPage === 1"
        @click="currentPage--"
      >
        ‹
      </button>
      <template v-for="page in visiblePages()" :key="String(page)">
        <span v-if="page === '...'" class="w-8 h-8 flex items-center justify-center text-text-muted text-sm">…</span>
        <button
          v-else
          class="w-8 h-8 flex items-center justify-center rounded text-sm font-display font-medium transition-colors"
          :class="page === currentPage ? 'bg-primary text-white' : 'border border-border text-text-secondary hover:bg-surface'"
          @click="currentPage = Number(page)"
        >
          {{ page }}
        </button>
      </template>
      <button
        class="w-8 h-8 flex items-center justify-center rounded border border-border text-text-secondary hover:bg-surface disabled:opacity-40"
        :disabled="currentPage === totalPages"
        @click="currentPage++"
      >
        ›
      </button>
    </div>
  </div>

  <!-- Create/Edit dialog -->
  <CreateUserDialog
    :open="dialogOpen"
    :user="editingUser"
    @close="dialogOpen = false"
    @save="handleSave"
  />

  <!-- Delete confirm dialog -->
  <AppDialog :open="deleteDialogOpen" title="Delete User" size="sm" @close="deleteDialogOpen = false">
    <p class="text-sm text-text-secondary font-sans">
      Are you sure you want to delete <strong class="text-text-primary">{{ deletingUser?.name }}</strong>? This action cannot be undone.
    </p>
    <template #footer>
      <button
        class="px-5 py-2 rounded-lg border border-border text-sm font-display font-medium text-text-secondary hover:bg-surface transition-colors"
        @click="deleteDialogOpen = false"
      >
        Cancel
      </button>
      <button
        class="px-5 py-2 rounded-lg bg-danger text-white text-sm font-display font-medium hover:opacity-80 transition-opacity"
        @click="confirmDelete"
      >
        Delete
      </button>
    </template>
  </AppDialog>
</template>
```

**Step 2: Add users routes to router**

In `src/app/router/index.ts`, add two children under the `/` layout (after the dashboard entry):

```ts
{ path: 'users', component: () => import('@/modules/users/pages/UserListPage.vue') },
{ path: 'users/:id', component: () => import('@/modules/users/pages/UserDetailPage.vue') },
```

The children array should look like:
```ts
children: [
  { path: '', redirect: '/dashboard' },
  { path: 'dashboard', component: () => import('@/modules/dashboard/pages/DashboardPage.vue') },
  { path: 'users', component: () => import('@/modules/users/pages/UserListPage.vue') },
  { path: 'users/:id', component: () => import('@/modules/users/pages/UserDetailPage.vue') },
],
```

**Step 3: Build check**

```bash
npm run build 2>&1 | tail -15
```

Note: `UserDetailPage.vue` doesn't exist yet — the build will fail on the router import. Create a temporary placeholder to unblock the build:

```vue
<!-- src/modules/users/pages/UserDetailPage.vue (TEMPORARY PLACEHOLDER) -->
<template><div class="p-6 text-text-primary">User Detail — coming in Task 7</div></template>
```

Then re-run build:

```bash
npm run build 2>&1 | tail -15
```

Expected: built successfully.

**Step 4: Commit**

```bash
git add src/modules/users/pages/UserListPage.vue src/modules/users/pages/UserDetailPage.vue src/app/router/index.ts
git commit -m "feat(users): add UserListPage, placeholder UserDetailPage, wire router"
```

---

## Task 7: UserDetailPage

**Files:**
- Modify: `src/modules/users/pages/UserDetailPage.vue` (replace placeholder)

**Step 1: Replace the placeholder with the full component**

```vue
<!-- src/modules/users/pages/UserDetailPage.vue -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Pencil } from 'lucide-vue-next'
import UserStatusBadge from '../components/UserStatusBadge.vue'
import UserPermissionsCard from '../components/UserPermissionsCard.vue'
import UserActivityCard from '../components/UserActivityCard.vue'
import CreateUserDialog from '../components/CreateUserDialog.vue'
import { mockUsers } from '../data/mockUsers'
import type { User } from '../types'

const route = useRoute()
const router = useRouter()

// Find user in mock data — keep a local ref so edits reflect immediately
const users = ref<User[]>([...mockUsers])
const user = computed(() => users.value.find(u => u.id === Number(route.params.id)) ?? null)

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

// Edit dialog
const editOpen = ref(false)

function handleSave(data: Partial<User>) {
  const idx = users.value.findIndex(u => u.id === user.value?.id)
  if (idx !== -1) users.value[idx] = { ...users.value[idx], ...data }
  editOpen.value = false
}
</script>

<template>
  <!-- Not found -->
  <div v-if="!user" class="flex flex-col items-center justify-center py-24 gap-4">
    <p class="text-text-secondary font-sans">User not found.</p>
    <button
      class="px-4 py-2 bg-primary text-white rounded-lg text-sm font-display"
      @click="router.push('/users')"
    >
      Back to Users
    </button>
  </div>

  <div v-else class="flex flex-col gap-6">
    <!-- Profile header -->
    <div class="bg-primary-dark rounded-[10px] px-8 py-6 flex items-center gap-5">
      <div class="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center shrink-0">
        <span class="text-xl font-display font-semibold text-white">{{ initials(user.name) }}</span>
      </div>
      <div>
        <div class="flex items-center gap-3 mb-1">
          <h1 class="text-xl font-display font-semibold text-white">{{ user.name }}</h1>
          <UserStatusBadge :status="user.status" />
        </div>
        <p class="text-sm text-white/70 font-sans">{{ user.email }}</p>
      </div>
    </div>

    <!-- 4 info blocks -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div class="bg-white rounded-[10px] border border-border p-5 shadow-sm">
        <p class="text-xs text-text-muted font-display mb-1">Role</p>
        <p class="text-base font-display font-semibold text-text-primary">{{ user.role }}</p>
      </div>
      <div class="bg-white rounded-[10px] border border-border p-5 shadow-sm">
        <p class="text-xs text-text-muted font-display mb-1">Faculties</p>
        <ul v-if="user.faculties.length" class="list-disc list-inside">
          <li v-for="f in user.faculties" :key="f" class="text-sm font-sans text-text-primary">{{ f }}</li>
        </ul>
        <p v-else class="text-sm font-sans text-text-muted">—</p>
      </div>
      <div class="bg-white rounded-[10px] border border-border p-5 shadow-sm">
        <p class="text-xs text-text-muted font-display mb-1">Last Login</p>
        <p class="text-sm font-display font-semibold text-text-primary">{{ user.lastLogin }}</p>
      </div>
      <div class="bg-white rounded-[10px] border border-border p-5 shadow-sm">
        <p class="text-xs text-text-muted font-display mb-1">Created At</p>
        <p class="text-sm font-display font-semibold text-text-primary">{{ user.createdAt }}</p>
      </div>
    </div>

    <!-- Permissions + Activity -->
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <UserPermissionsCard :permissions="user.permissions" />
      <UserActivityCard :activities="user.recentActivity" />
    </div>

    <!-- Bottom actions -->
    <div class="flex items-center justify-end gap-3 pt-2">
      <button
        class="flex items-center gap-2 px-5 py-2 rounded-lg border border-border text-sm font-display font-medium text-text-secondary hover:bg-surface transition-colors"
        @click="router.push('/users')"
      >
        <ArrowLeft class="w-4 h-4" />
        Back
      </button>
      <button
        class="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-white text-sm font-display font-medium hover:bg-primary-mid transition-colors"
        @click="editOpen = true"
      >
        <Pencil class="w-4 h-4" />
        Edit User
      </button>
    </div>
  </div>

  <!-- Edit dialog -->
  <CreateUserDialog
    :open="editOpen"
    :user="user"
    @close="editOpen = false"
    @save="handleSave"
  />
</template>
```

**Step 2: Build check — must pass with zero errors**

```bash
npm run build 2>&1 | tail -15
```

Expected: `✓ built in Xs` with no errors.

**Step 3: Start dev server and verify visually**

```bash
npm run dev
```

Open `http://localhost:517X/users` and confirm:
- [ ] List page renders with 15 mock users (2 pages)
- [ ] Search filters by name/email
- [ ] Role/Status/Faculty dropdowns filter correctly
- [ ] Clicking a name navigates to `/users/:id`
- [ ] "Add User" opens Create dialog
- [ ] Pencil icon opens Edit dialog (pre-filled)
- [ ] Ban icon opens Delete confirm dialog
- [ ] Detail page shows profile header, 4 info blocks, permissions grid, activity table
- [ ] "Back" button returns to list
- [ ] "Edit User" on detail page opens pre-filled dialog
- [ ] No console errors

**Step 4: Commit**

```bash
git add src/modules/users/pages/UserDetailPage.vue
git commit -m "feat(users): add UserDetailPage"
```
