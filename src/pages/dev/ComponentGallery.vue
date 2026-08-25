<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { FolderOpen } from 'lucide-vue-next'
import AppButton from '@/shared/components/AppButton.vue'
import AppDialog from '@/shared/components/AppDialog.vue'
import StatusBadge from '@/shared/components/StatusBadge.vue'
import FormInput from '@/shared/components/FormInput.vue'
import FormField from '@/shared/components/FormField.vue'
import DataTable from '@/shared/components/DataTable.vue'
import AppPagination from '@/shared/components/AppPagination.vue'
import SearchBar from '@/shared/components/SearchBar.vue'
import FilterDropdown from '@/shared/components/FilterDropdown.vue'
import ExportButton from '@/shared/components/ExportButton.vue'
import LiveBadge from '@/shared/components/LiveBadge.vue'
import AppFileUpload from '@/shared/components/AppFileUpload.vue'
import AppAsyncSelect from '@/shared/components/AppAsyncSelect.vue'
import AppEmptyState from '@/shared/components/AppEmptyState.vue'
import AppErrorState from '@/shared/components/AppErrorState.vue'
import { useToasts } from '@/shared/composables/useToasts'
import { useDebouncedRef } from '@/shared/composables/useDebouncedRef'
import { useServerTable } from '@/shared/composables/useServerTable'
import type { ServerTableParams, ServerTableResponse } from '@/shared/composables/useServerTable'
import { keysToCamel, keysToSnake } from '@/shared/utils/casing'
import { relativeTime } from '@/shared/utils/date'

const search = ref('')
const filter = ref('')
const page = ref(1)
const inputVal = ref('')
const dialogOpen = ref(false)

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email', align: 'center' as const },
  { key: 'status', label: 'Status', align: 'center' as const },
  { key: 'actions', label: 'Actions', align: 'center' as const },
]

const filterOptions = [
  { label: 'All Roles', value: '' },
  { label: 'Admin', value: 'admin' },
  { label: 'Archivist', value: 'archivist' },
  { label: 'Faculty Staff', value: 'faculty' },
]

/* ---------------------------------------------------------------- toasts */
const {
  success: toastSuccess,
  error: toastError,
  info: toastInfo,
  clear: clearToasts,
} = useToasts()

/* ----------------------------------------------------------- file upload */
const uploadFiles = ref<File[]>([])
const uploadProgress = ref<Record<string, number>>({})
const uploadErrors = ref<string[]>([])

function resetUpload(): void {
  uploadFiles.value = []
  uploadProgress.value = {}
  uploadErrors.value = []
}

function simulateUpload(): void {
  const steps = [35, 70, 100]
  uploadProgress.value = Object.fromEntries(
    uploadFiles.value.map((file, index) => [file.name, steps[index % steps.length] ?? 50]),
  )
}

/* ---------------------------------------------------------- async select */
interface DemoOption {
  value: string
  label: string
}

const FACULTIES: DemoOption[] = [
  { value: '1', label: 'Faculty of Medicine' },
  { value: '2', label: 'Faculty of Dentistry' },
  { value: '3', label: 'Faculty of Pharmacy' },
  { value: '4', label: 'Faculty of Information Technology' },
  { value: '5', label: 'Faculty of Basic Medical Sciences' },
  { value: '6', label: 'Faculty of Nursing' },
]

const selectedFaculty = ref<DemoOption | null>(null)

function searchFaculties(query: string): Promise<DemoOption[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const term = query.toLowerCase()
      resolve(FACULTIES.filter((option) => option.label.toLowerCase().includes(term)))
    }, 350)
  })
}

/* --------------------------------------------------------- debounced ref */
const debouncedSearch = useDebouncedRef(search, 300)

/* --------------------------------------------------------- server table */
interface DemoRow {
  id: number
  name: string
  email: string
}

const DEMO_ROWS: DemoRow[] = Array.from({ length: 23 }, (_, index) => ({
  id: index + 1,
  name: `Student ${index + 1}`,
  email: `student${index + 1}@limu.edu.ly`,
}))

/** Stands in for a Laravel `{ data, meta }` endpoint. */
function demoFetcher(params: ServerTableParams): Promise<ServerTableResponse<DemoRow>> {
  const term = String(params.search ?? '').toLowerCase()
  const matched = DEMO_ROWS.filter((row) => row.name.toLowerCase().includes(term))
  const start = (params.page - 1) * params.per_page
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        data: matched.slice(start, start + params.per_page),
        meta: {
          current_page: params.page,
          last_page: Math.max(1, Math.ceil(matched.length / params.per_page)),
          total: matched.length,
        },
      })
    }, 300)
  })
}

const {
  rows: serverRows,
  loading: serverLoading,
  error: serverError,
  page: serverPage,
  totalPages: serverTotalPages,
  total: serverTotal,
  isEmpty: serverIsEmpty,
  setFilters: setServerFilters,
  refresh: refreshServerTable,
} = useServerTable<DemoRow>(demoFetcher, { perPage: 5 })

const serverSearch = ref('')
const debouncedServerSearch = useDebouncedRef(serverSearch, 300)
watch(debouncedServerSearch, (term) => setServerFilters({ search: term }))

const serverColumns = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email', align: 'center' as const },
]

/* --------------------------------------------------------------- casing */
const wirePayload = {
  id: 7,
  full_name: 'Ahmed Ali',
  created_at: '2026-08-20T09:15:00Z',
  faculty: { faculty_name: 'Medicine', is_active: true },
  borrowed_items: [{ item_id: 3, due_date: '2026-09-01' }],
}
const camelPayload = computed(() => JSON.stringify(keysToCamel(wirePayload), null, 2))
const snakeRoundTrip = computed(() =>
  JSON.stringify(keysToSnake(keysToCamel(wirePayload)), null, 2),
)

/* -------------------------------------------------------- relative time */
const relativeSamples = computed(() => {
  const now = Date.now()
  const minute = 60_000
  return [
    { label: '45 seconds ago', iso: new Date(now - 45 * 1000).toISOString() },
    { label: '12 minutes ago', iso: new Date(now - 12 * minute).toISOString() },
    { label: '5 hours ago', iso: new Date(now - 5 * 60 * minute).toISOString() },
    { label: '3 days ago', iso: new Date(now - 3 * 24 * 60 * minute).toISOString() },
    { label: 'in 2 weeks', iso: new Date(now + 14 * 24 * 60 * minute).toISOString() },
  ].map((sample) => ({ ...sample, formatted: relativeTime(sample.iso) }))
})
</script>

<template>
  <div class="p-8 space-y-12 max-w-5xl">
    <h1 class="text-2xl font-bold text-text-primary font-sans">Component Gallery</h1>

    <!-- AppButton -->
    <section class="space-y-3">
      <h2 class="text-lg font-semibold text-text-secondary font-sans">AppButton</h2>
      <div class="flex flex-wrap gap-3">
        <AppButton variant="primary">Add User</AppButton>
        <AppButton variant="accent">Save</AppButton>
        <AppButton variant="danger">Delete</AppButton>
        <AppButton variant="ghost">Cancel</AppButton>
        <AppButton variant="primary" :loading="true">Loading…</AppButton>
        <AppButton variant="primary" :disabled="true">Disabled</AppButton>
      </div>
    </section>

    <!-- ExportButton -->
    <section class="space-y-3">
      <h2 class="text-lg font-semibold text-text-secondary font-sans">ExportButton</h2>
      <div class="flex flex-wrap gap-3 items-center">
        <ExportButton />
      </div>
    </section>

    <!-- LiveBadge -->
    <section class="space-y-3">
      <h2 class="text-lg font-semibold text-text-secondary font-sans">LiveBadge</h2>
      <div class="flex flex-wrap gap-3 items-center">
        <LiveBadge />
      </div>
    </section>

    <!-- StatusBadge -->
    <section class="space-y-3">
      <h2 class="text-lg font-semibold text-text-secondary font-sans">StatusBadge</h2>
      <div class="flex flex-wrap gap-3">
        <StatusBadge status="active">Active</StatusBadge>
        <StatusBadge status="inactive">Inactive</StatusBadge>
        <StatusBadge status="pending">Pending</StatusBadge>
        <StatusBadge status="overdue">Overdue</StatusBadge>
        <StatusBadge status="returned">Returned</StatusBadge>
      </div>
    </section>

    <!-- FormField + FormInput -->
    <section class="space-y-3">
      <h2 class="text-lg font-semibold text-text-secondary font-sans">FormField + FormInput</h2>
      <div class="max-w-sm space-y-4">
        <FormField label="Email address" field-id="email">
          <FormInput
            id="email"
            v-model="inputVal"
            type="email"
            placeholder="Enter your email address"
          />
        </FormField>
        <FormField label="Password" field-id="password" error="Password is required">
          <FormInput id="password" type="password" placeholder="Enter your password" />
        </FormField>
      </div>
    </section>

    <!-- SearchBar + FilterDropdown -->
    <section class="space-y-3">
      <h2 class="text-lg font-semibold text-text-secondary font-sans">
        SearchBar + FilterDropdown
      </h2>
      <div class="flex gap-3 items-center">
        <div class="w-80">
          <SearchBar v-model="search" />
        </div>
        <div class="w-44">
          <FilterDropdown v-model="filter" :options="filterOptions" placeholder="Role" />
        </div>
      </div>
    </section>

    <!-- DataTable -->
    <section class="space-y-3">
      <h2 class="text-lg font-semibold text-text-secondary font-sans">DataTable</h2>
      <DataTable :columns="columns">
        <template #rows>
          <tr class="bg-surface-card border border-border">
            <td class="px-3 py-3 text-sm text-text-primary font-sans">Ahmed Ali</td>
            <td class="px-3 py-3 text-sm text-text-secondary font-sans text-center">
              a@limu.edu.ly
            </td>
            <td class="px-3 py-3 text-center"><StatusBadge status="active">Active</StatusBadge></td>
            <td class="px-3 py-3 text-center text-text-secondary text-sm font-sans">—</td>
          </tr>
          <tr class="bg-surface-card border border-border">
            <td class="px-3 py-3 text-sm text-text-primary font-sans">Sara Ahmed</td>
            <td class="px-3 py-3 text-sm text-text-secondary font-sans text-center">
              sara@limu.edu.ly
            </td>
            <td class="px-3 py-3 text-center">
              <StatusBadge status="inactive">Inactive</StatusBadge>
            </td>
            <td class="px-3 py-3 text-center text-text-secondary text-sm font-sans">—</td>
          </tr>
        </template>
      </DataTable>
    </section>

    <!-- AppPagination -->
    <section class="space-y-3">
      <h2 class="text-lg font-semibold text-text-secondary font-sans">AppPagination</h2>
      <AppPagination v-model:current-page="page" :total-pages="10" />
      <p class="text-sm text-text-secondary font-sans">Current: page {{ page }}</p>
    </section>

    <!-- AppDialog -->
    <section class="space-y-3">
      <h2 class="text-lg font-semibold text-text-secondary font-sans">AppDialog</h2>
      <AppButton variant="primary" @click="dialogOpen = true">Open Dialog</AppButton>
      <AppDialog :open="dialogOpen" title="Confirm Action" size="md" @close="dialogOpen = false">
        <p class="text-sm text-text-secondary font-sans">
          Are you sure you want to perform this action? This cannot be undone.
        </p>
        <template #footer>
          <AppButton variant="ghost" @click="dialogOpen = false">Cancel</AppButton>
          <AppButton variant="danger" @click="dialogOpen = false">Confirm</AppButton>
        </template>
      </AppDialog>
    </section>

    <!-- Toasts -->
    <section class="space-y-3">
      <h2 class="text-lg font-semibold text-text-secondary font-sans">useToasts + AppToastHost</h2>
      <p class="text-sm text-text-secondary font-sans">
        Auto-dismiss after 4s, or close manually. These render through the one
        <code class="text-text-primary">AppToastHost</code> mounted in
        <code class="text-text-primary">App.vue</code> — this page deliberately does not mount its
        own.
      </p>
      <div class="flex flex-wrap gap-3">
        <AppButton variant="primary" @click="toastSuccess('Faculty created successfully')">
          Success toast
        </AppButton>
        <AppButton variant="danger" @click="toastError('Could not delete this user')">
          Error toast
        </AppButton>
        <AppButton variant="accent" @click="toastInfo('Export queued — check back shortly')">
          Info toast
        </AppButton>
        <AppButton variant="ghost" @click="clearToasts()">Clear all</AppButton>
      </div>
    </section>

    <!-- AppFileUpload -->
    <section class="space-y-3">
      <h2 class="text-lg font-semibold text-text-secondary font-sans">AppFileUpload</h2>
      <div class="max-w-xl space-y-3">
        <AppFileUpload
          v-model:files="uploadFiles"
          accept=".pdf,.docx,.xlsx,image/*"
          :max-size-mb="5"
          :max-files="4"
          :progress="uploadProgress"
          @error="uploadErrors = $event"
        />
        <div class="flex flex-wrap gap-3">
          <AppButton variant="accent" :disabled="!uploadFiles.length" @click="simulateUpload">
            Simulate upload progress
          </AppButton>
          <AppButton variant="ghost" :disabled="!uploadFiles.length" @click="resetUpload">
            Reset
          </AppButton>
        </div>
        <p v-if="uploadErrors.length" class="text-xs text-text-secondary font-sans">
          Last rejection: {{ uploadErrors[0] }}
        </p>
      </div>
    </section>

    <!-- AppAsyncSelect -->
    <section class="space-y-3">
      <h2 class="text-lg font-semibold text-text-secondary font-sans">AppAsyncSelect</h2>
      <div class="max-w-sm space-y-2">
        <FormField label="Faculty" field-id="faculty-picker">
          <AppAsyncSelect
            id="faculty-picker"
            v-model="selectedFaculty"
            :search-fn="searchFaculties"
            placeholder="Search faculties…"
            :min-chars="2"
          />
        </FormField>
        <p class="text-sm text-text-secondary font-sans">
          Selected: {{ selectedFaculty?.label ?? '—' }}
        </p>
      </div>
    </section>

    <!-- AppEmptyState / AppErrorState -->
    <section class="space-y-3">
      <h2 class="text-lg font-semibold text-text-secondary font-sans">
        AppEmptyState + AppErrorState
      </h2>
      <div class="grid gap-4 md:grid-cols-2">
        <div class="rounded-[10px] border border-border bg-surface-card">
          <AppEmptyState
            :icon="FolderOpen"
            title="No borrowings yet"
            description="Records will appear here once a faculty member borrows a file."
          >
            <template #action>
              <AppButton variant="primary" size="sm">New borrowing</AppButton>
            </template>
          </AppEmptyState>
        </div>
        <div class="rounded-[10px] border border-border bg-surface-card">
          <AppErrorState
            title="Could not load users"
            description="The server did not respond. Check your connection and try again."
            @retry="toastInfo('Retry clicked')"
          />
        </div>
      </div>
    </section>

    <!-- useDebouncedRef -->
    <section class="space-y-3">
      <h2 class="text-lg font-semibold text-text-secondary font-sans">useDebouncedRef</h2>
      <div class="w-80">
        <SearchBar v-model="search" placeholder="Type quickly…" />
      </div>
      <p class="text-sm text-text-secondary font-sans">
        Raw: <span class="text-text-primary">{{ search || '—' }}</span> · Debounced (300ms):
        <span class="text-text-primary">{{ debouncedSearch || '—' }}</span>
      </p>
    </section>

    <!-- useServerTable -->
    <section class="space-y-3">
      <h2 class="text-lg font-semibold text-text-secondary font-sans">useServerTable</h2>
      <div class="flex items-center gap-3">
        <div class="w-80">
          <SearchBar v-model="serverSearch" placeholder="Search students…" />
        </div>
        <AppButton variant="ghost" @click="refreshServerTable()">Refresh</AppButton>
        <span class="text-sm text-text-secondary font-sans">
          {{ serverLoading ? 'Loading…' : `${serverTotal} results` }}
        </span>
      </div>

      <AppErrorState
        v-if="serverError"
        compact
        :description="serverError"
        @retry="refreshServerTable()"
      />
      <AppEmptyState
        v-else-if="serverIsEmpty"
        compact
        title="No students match this search"
        description="Try a different name."
      />
      <DataTable v-else :columns="serverColumns">
        <template #rows>
          <tr v-for="row in serverRows" :key="row.id" class="bg-surface-card border border-border">
            <td class="px-3 py-3 text-sm text-text-primary font-sans">{{ row.name }}</td>
            <td class="px-3 py-3 text-sm text-text-secondary font-sans text-center">
              {{ row.email }}
            </td>
          </tr>
        </template>
      </DataTable>

      <AppPagination v-model:current-page="serverPage" :total-pages="serverTotalPages" />
    </section>

    <!-- casing -->
    <section class="space-y-3">
      <h2 class="text-lg font-semibold text-text-secondary font-sans">keysToCamel / keysToSnake</h2>
      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-1">
          <p class="text-sm text-text-secondary font-sans">keysToCamel(wire payload)</p>
          <pre class="overflow-x-auto rounded-[8px] bg-surface p-3 text-xs text-text-primary">{{
            camelPayload
          }}</pre>
        </div>
        <div class="space-y-1">
          <p class="text-sm text-text-secondary font-sans">keysToSnake(round trip)</p>
          <pre class="overflow-x-auto rounded-[8px] bg-surface p-3 text-xs text-text-primary">{{
            snakeRoundTrip
          }}</pre>
        </div>
      </div>
    </section>

    <!-- relativeTime -->
    <section class="space-y-3">
      <h2 class="text-lg font-semibold text-text-secondary font-sans">relativeTime</h2>
      <ul class="space-y-1">
        <li
          v-for="sample in relativeSamples"
          :key="sample.label"
          class="text-sm text-text-secondary font-sans"
        >
          <span class="text-text-primary">{{ sample.formatted }}</span>
          <span class="text-text-muted"> — {{ sample.iso }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>
