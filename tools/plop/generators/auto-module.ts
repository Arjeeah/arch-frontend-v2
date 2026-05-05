import * as fs from 'node:fs'
import * as path from 'node:path'
import type { CustomActionFunction } from 'plop'

// ── Types ──────────────────────────────────────────────────────────────────

interface Field {
  name: string
  type: 'text' | 'number' | 'date' | 'select'
  options?: string[]
  filterable?: boolean
}

// ── String helpers ─────────────────────────────────────────────────────────

function toPascal(kebab: string): string {
  return kebab
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('')
}

function toCamel(kebab: string): string {
  const p = toPascal(kebab)
  return p.charAt(0).toLowerCase() + p.slice(1)
}

/** camelCase → "Title Case" */
function toLabel(camel: string): string {
  return camel
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim()
}

// ── Builder functions ──────────────────────────────────────────────────────

function buildIndex(pascal: string): string {
  return `// ${pascal} module entrypoint
// Re-export only what other modules need to consume directly.
export {}
`
}

function buildTypes(pascal: string, fields: Field[]): string {
  const fieldLines = fields.map((f) => {
    if (f.type === 'select') {
      const union = f.options!.map((o) => `'${o}'`).join(' | ')
      return `  ${f.name}: ${union}`
    }
    return `  ${f.name}: ${f.type === 'number' ? 'number' : 'string'}`
  })

  return `// Types for the ${pascal} module

export interface ${pascal} {
  id: number
${fieldLines.join('\n')}
  createdAt: string
}
`
}

function buildApi(pascal: string, camel: string, kebab: string): string {
  return `import { http } from '@/app/plugins/axios'
import type { ${pascal} } from '../types'

export const ${camel}Api = {
  list: () =>
    http.get<${pascal}[]>('/v1/${kebab}s').then(r => r.data),
  show: (id: number) =>
    http.get<${pascal}>(\`/v1/${kebab}s/\${id}\`).then(r => r.data),
  create: (data: Partial<${pascal}>) =>
    http.post<${pascal}>('/v1/${kebab}s', data).then(r => r.data),
  update: (id: number, data: Partial<${pascal}>) =>
    http.put<${pascal}>(\`/v1/${kebab}s/\${id}\`, data).then(r => r.data),
  delete: (id: number) =>
    http.delete(\`/v1/${kebab}s/\${id}\`),
}
`
}

function buildStore(pascal: string, camel: string): string {
  return `import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ${pascal} } from '../types'
// import { ${camel}Api } from '../api/${camel}Api'

export const use${pascal}Store = defineStore('${camel}', () => {
  const items = ref<${pascal}[]>([])
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      // items.value = await ${camel}Api.list()
    } finally {
      loading.value = false
    }
  }

  return { items, loading, fetchAll }
})
`
}

function buildTable(pascal: string, fields: Field[]): string {
  const headerCells = fields
    .map((f) => {
      const label = toLabel(f.name)
      const widthClass = f.type === 'select' ? 'w-[150px] shrink-0' : 'flex-1 min-w-0'
      return `      <div class="flex justify-center items-center px-[13px] ${widthClass} h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">${label}</span>
      </div>`
    })
    .join('\n')

  const skeletonCells = fields
    .map((f) => {
      if (f.type === 'select') {
        return `        <div class="flex justify-center items-center px-[13px] w-[150px] shrink-0 h-full">
          <div class="h-4 bg-surface rounded animate-pulse w-[60px]" />
        </div>`
      }
      return `        <div class="flex justify-center items-center px-[13px] flex-1 min-w-0 h-full">
          <div class="h-4 bg-surface rounded animate-pulse w-[80px]" />
        </div>`
    })
    .join('\n')

  const dataCells = fields
    .map((f) => {
      const label = toLabel(f.name)
      if (f.type === 'select') {
        const firstOpt = f.options![0]
        return `        <!-- ${label} -->
        <div class="flex justify-center items-center px-[13px] w-[150px] shrink-0">
          <span
            class="px-3 py-1 rounded-full text-xs font-medium"
            :class="item.${f.name} === '${firstOpt}' ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-surface text-text-secondary'"
          >
            {{ item.${f.name} }}
          </span>
        </div>`
      }
      return `        <!-- ${label} -->
        <div class="flex items-center justify-center px-[13px] flex-1 min-w-0 overflow-hidden">
          <span class="text-[15px] font-sans text-text-secondary truncate">{{ item.${f.name} }}</span>
        </div>`
    })
    .join('\n')

  return `<script setup lang="ts">
import { SquarePen, Ban } from 'lucide-vue-next'
import type { ${pascal} } from '../types'

defineProps<{
  items: ${pascal}[]
  loading?: boolean
}>()

const emit = defineEmits<{
  edit: [item: ${pascal}]
  delete: [item: ${pascal}]
}>()
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Header row -->
    <div class="flex flex-row items-center bg-surface-table border border-border rounded-[4px] h-[48px]">
${headerCells}
      <div class="flex justify-center items-center px-[13px] w-[90px] shrink-0 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Actions</span>
      </div>
    </div>

    <!-- Loading skeleton -->
    <template v-if="loading">
      <div
        v-for="i in 6"
        :key="i"
        class="flex flex-row items-center bg-white border border-border rounded-[4px] h-[48px]"
      >
${skeletonCells}
        <div class="flex justify-center items-center px-[13px] w-[90px] shrink-0 h-full">
          <div class="h-4 bg-surface rounded animate-pulse w-[60px]" />
        </div>
      </div>
    </template>

    <!-- Data rows -->
    <template v-else>
      <div
        v-for="item in items"
        :key="item.id"
        class="flex flex-row items-center bg-white border border-border rounded-[4px] h-[48px]"
      >
${dataCells}

        <!-- Actions -->
        <div class="flex justify-center items-center px-[13px] gap-[15px] w-[90px] shrink-0">
          <button
            class="text-[#4285F4] hover:opacity-70 transition-opacity"
            title="Edit"
            @click="emit('edit', item)"
          >
            <SquarePen class="w-6 h-6" />
          </button>
          <button
            class="text-danger hover:opacity-70 transition-opacity"
            title="Delete"
            @click="emit('delete', item)"
          >
            <Ban class="w-6 h-6" />
          </button>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-if="!items.length"
        class="flex justify-center items-center bg-white border border-border rounded-[4px] py-12"
      >
        <span class="text-sm text-text-muted font-sans">No records found.</span>
      </div>
    </template>
  </div>
</template>
`
}

function buildDialog(pascal: string, fields: Field[]): string {
  const selectFields = fields.filter((f) => f.type === 'select')
  const hasSelect = selectFields.length > 0

  const imports = [
    `import { reactive, watch, computed } from 'vue'`,
    `import AppDialog from '@/shared/components/AppDialog.vue'`,
    `import FormInput from '@/shared/components/FormInput.vue'`,
    hasSelect ? `import AppSelect from '@/shared/components/AppSelect.vue'` : null,
    `import type { ${pascal} } from '../types'`,
  ]
    .filter(Boolean)
    .join('\n')

  const formFields = fields.map((f) => `  ${f.name}: '',`).join('\n')
  const errorFields = fields.map((f) => `  ${f.name}: '',`).join('\n')

  const watchFill = fields
    .map((f) => `  form.${f.name} = props.item ? String(props.item.${f.name} ?? '') : ''`)
    .join('\n')

  const watchReset = fields.map((f) => `  errors.${f.name} = ''`).join('\n')

  const validateLines = fields
    .map((f) => {
      const label = toLabel(f.name)
      return `  errors.${f.name} = form.${f.name}.trim() ? '' : '${label} is required'`
    })
    .join('\n')

  const validateReturn =
    fields.length > 0 ? fields.map((f) => `!errors.${f.name}`).join(' && ') : 'true'

  const submitLines = fields
    .map((f) => {
      if (f.type === 'number') return `    ${f.name}: Number(form.${f.name}),`
      return `    ${f.name}: form.${f.name},`
    })
    .join('\n')

  const optionsConsts = selectFields
    .map((f) => {
      const opts = f.options!.map((o) => `{ value: '${o}', label: '${o}' }`).join(', ')
      return `const ${f.name}Options = [${opts}]`
    })
    .join('\n')

  const inputEls = fields
    .map((f) => {
      const label = toLabel(f.name)
      if (f.type === 'select') {
        return `      <div>
        <label class="block text-base font-sans text-text-primary mb-[7px]">${label}</label>
        <AppSelect
          v-model="form.${f.name}"
          :options="${f.name}Options"
          placeholder="Select ${label.toLowerCase()}"
          :placeholder-disabled="true"
        />
        <p v-if="errors.${f.name}" class="mt-1 text-xs text-danger">{{ errors.${f.name} }}</p>
      </div>`
      }
      const type = f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'
      const placeholderAttr = f.type !== 'date' ? ` placeholder="Enter ${label.toLowerCase()}"` : ''
      return `      <div>
        <label class="block text-base font-sans text-text-primary mb-[7px]">${label}</label>
        <FormInput v-model="form.${f.name}" type="${type}"${placeholderAttr} />
        <p v-if="errors.${f.name}" class="mt-1 text-xs text-danger">{{ errors.${f.name} }}</p>
      </div>`
    })
    .join('\n\n')

  return `<script setup lang="ts">
${imports}

const props = defineProps<{
  open: boolean
  item?: ${pascal} | null
}>()

const emit = defineEmits<{
  close: []
  save: [data: Partial<${pascal}>]
}>()

const isEdit = computed(() => !!props.item)

const form = reactive({
${formFields}
})

const errors = reactive({
${errorFields}
})
${optionsConsts ? `\n${optionsConsts}\n` : ''}
watch(() => props.open, (open) => {
  if (!open) return
${watchFill}
${watchReset}
})

function validate() {
${validateLines}
  return ${validateReturn}
}

function submit() {
  if (!validate()) return
  emit('save', {
${submitLines}
  })
}
</script>

<template>
  <AppDialog
    :open="open"
    :title="isEdit ? 'Edit ${pascal}' : 'Create ${pascal}'"
    size="md"
    @close="emit('close')"
  >
    <p class="text-sm font-sans text-[#6F6F6F] mb-5">
      {{ isEdit ? 'Update the record details.' : 'Fill in the details to create a new record.' }}
    </p>

    <div class="flex flex-col gap-4">
${inputEls}
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
        {{ isEdit ? 'Update ${pascal}' : 'Save ${pascal}' }}
      </button>
    </template>
  </AppDialog>
</template>
`
}

function buildPage(pascal: string, camel: string, kebab: string, fields: Field[]): string {
  const textFields = fields.filter((f) => f.type === 'text')
  const filterFields = fields.filter((f) => f.type === 'select' && f.filterable)
  const hasFilters = filterFields.length > 0

  const filterRefs = filterFields.map((f) => `const ${f.name}Filter = ref('')`).join('\n')

  const filterOptionsConsts = filterFields
    .map((f) => {
      const opts = f.options!.map((o) => `{ value: '${o}', label: '${o}' }`).join(', ')
      return `const ${f.name}Options = [${opts}]`
    })
    .join('\n')

  const searchCondition =
    textFields.length > 0
      ? textFields.map((f) => `item.${f.name}.toLowerCase().includes(q)`).join(' || ')
      : 'true'

  const filterConditions = filterFields
    .map((f) => {
      const cap = toPascal(f.name)
      return `    const match${cap} = !${f.name}Filter.value || item.${f.name} === ${f.name}Filter.value`
    })
    .join('\n')

  const filterReturns = [
    'matchSearch',
    ...filterFields.map((f) => `match${toPascal(f.name)}`),
  ].join(' && ')

  const watchSources = ['search', ...filterFields.map((f) => `${f.name}Filter`)].join(', ')

  const filterDropdowns = filterFields
    .map((f) => {
      const label = toLabel(f.name)
      return `      <AppSelect v-model="${f.name}Filter" :options="${f.name}Options" placeholder="All ${label}" />`
    })
    .join('\n')

  const defaultFieldValues = fields
    .map((f) => {
      if (f.type === 'number') return `      ${f.name}: 0,`
      if (f.type === 'select') return `      ${f.name}: '' as ${pascal}['${f.name}'],`
      return `      ${f.name}: '',`
    })
    .join('\n')

  const firstIdentifier = textFields[0]?.name ?? fields[0]?.name ?? 'id'

  const imports = [
    `import { ref, computed, watch } from 'vue'`,
    `import { Search } from 'lucide-vue-next'`,
    `import { use${pascal}Store } from '../stores/use${pascal}Store'`,
    `import ${pascal}Table from '../components/${pascal}Table.vue'`,
    `import AppPagination from '@/shared/components/AppPagination.vue'`,
    `import AppConfirmDialog from '@/shared/components/AppConfirmDialog.vue'`,
    `import Create${pascal}Dialog from '../components/Create${pascal}Dialog.vue'`,
    hasFilters ? `import AppSelect from '@/shared/components/AppSelect.vue'` : null,
    `import { usePagination } from '@/composables/usePagination'`,
    `import type { ${pascal} } from '../types'`,
  ]
    .filter(Boolean)
    .join('\n')

  return `<script setup lang="ts">
${imports}

const store = use${pascal}Store()

const search = ref('')
${filterRefs}${filterRefs ? '\n' : ''}
const dialogOpen = ref(false)
const editingItem = ref<${pascal} | null>(null)
const deleteDialogOpen = ref(false)
const deletingItem = ref<${pascal} | null>(null)

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return store.items.filter(item => {
    const matchSearch = !q || ${searchCondition}
${filterConditions}
    return ${filterReturns}
  })
})

const { currentPage, totalPages, paginated, resetPage } = usePagination(filtered, 10)
watch([${watchSources}], resetPage)
${filterOptionsConsts ? `\n${filterOptionsConsts}\n` : ''}
function openCreate() { editingItem.value = null; dialogOpen.value = true }
function openEdit(item: ${pascal}) { editingItem.value = item; dialogOpen.value = true }
function openDelete(item: ${pascal}) { deletingItem.value = item; deleteDialogOpen.value = true }

function handleSave(data: Partial<${pascal}>) {
  if (editingItem.value) {
    const idx = store.items.findIndex(i => i.id === editingItem.value!.id)
    if (idx !== -1) store.items.splice(idx, 1, Object.assign({}, store.items[idx], data) as ${pascal})
  } else {
    const newId = Math.max(0, ...store.items.map(i => i.id)) + 1
    store.items.unshift(Object.assign({
      id: newId,
${defaultFieldValues}
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    }, data) as ${pascal})
  }
  dialogOpen.value = false
}

function confirmDelete() {
  if (deletingItem.value) {
    const idx = store.items.findIndex(i => i.id === deletingItem.value!.id)
    if (idx !== -1) store.items.splice(idx, 1)
  }
  deleteDialogOpen.value = false
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-display font-semibold text-text-primary">${pascal}</h1>
        <p class="text-sm text-text-secondary font-sans mt-0.5">Manage ${kebab} records</p>
      </div>
      <button
        class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-display font-medium hover:bg-primary-mid transition-colors"
        @click="openCreate"
      >
        Add ${pascal}
      </button>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-[15px] flex-wrap">
      <div class="relative flex-1 min-w-[200px]">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          v-model="search"
          type="text"
          placeholder="Search"
          class="w-full h-[42px] pl-9 pr-4 bg-white border border-border-dropdown rounded-lg text-xs font-display font-medium text-[#313144] placeholder:text-text-muted placeholder:font-display placeholder:font-light focus:outline-none focus:border-primary"
          style="border-width: 1.3px"
        />
      </div>
${filterDropdowns}
    </div>

    <!-- Table -->
    <${pascal}Table
      :items="paginated"
      :loading="store.loading"
      @edit="openEdit"
      @delete="openDelete"
    />

    <!-- Pagination -->
    <AppPagination
      v-if="!store.loading && totalPages > 1"
      v-model:currentPage="currentPage"
      :total-pages="totalPages"
    />
  </div>

  <!-- Create / Edit dialog -->
  <Create${pascal}Dialog
    :open="dialogOpen"
    :item="editingItem"
    @close="dialogOpen = false"
    @save="handleSave"
  />

  <!-- Delete confirm dialog -->
  <AppConfirmDialog
    :open="deleteDialogOpen"
    title="Delete ${pascal}"
    confirm-label="Delete"
    confirm-class="bg-danger text-white hover:opacity-80"
    @close="deleteDialogOpen = false"
    @confirm="confirmDelete"
  >
    <p class="text-sm text-text-secondary font-sans">
      Are you sure you want to delete
      <strong class="text-text-primary">{{ deletingItem?.${firstIdentifier} }}</strong>?
      This action cannot be undone.
    </p>
  </AppConfirmDialog>
</template>
`
}

// ── Main action ────────────────────────────────────────────────────────────

export const generateModule: CustomActionFunction = async (_answers, _config, _plop) => {
  const kebab = 'borrowing'
  const name = kebab
  const fields: Field[] = [
    { name: 'fileNumber', type: 'text' },
    { name: 'borrowerName', type: 'text' },
    { name: 'faculty', type: 'text', filterable: true },
    { name: 'purpose', type: 'text' },
    { name: 'borrowDate', type: 'text' },
    { name: 'dueDate', type: 'text' },
    { name: 'returnDate', type: 'text' },
    {
      name: 'status',
      type: 'select',
      options: ['borrowed', 'returned', 'overdue'],
      filterable: true,
    },
  ]

  const pascal = toPascal(name)
  const camel = toCamel(name)
  const kebabPath = name

  const basePath = path.join(process.cwd(), 'src', 'modules', kebabPath)
  fs.mkdirSync(path.join(basePath, 'pages'), { recursive: true })
  fs.mkdirSync(path.join(basePath, 'components'), { recursive: true })
  fs.mkdirSync(path.join(basePath, 'stores'), { recursive: true })
  fs.mkdirSync(path.join(basePath, 'api'), { recursive: true })

  fs.writeFileSync(path.join(basePath, 'index.ts'), buildIndex(pascal), 'utf8')
  fs.writeFileSync(path.join(basePath, 'types.ts'), buildTypes(pascal, fields), 'utf8')
  fs.writeFileSync(
    path.join(basePath, 'api', `${camel}Api.ts`),
    buildApi(pascal, camel, kebab),
    'utf8',
  )
  fs.writeFileSync(
    path.join(basePath, 'stores', `use${pascal}Store.ts`),
    buildStore(pascal, camel),
    'utf8',
  )
  fs.writeFileSync(
    path.join(basePath, 'components', `${pascal}Table.vue`),
    buildTable(pascal, fields),
    'utf8',
  )
  fs.writeFileSync(
    path.join(basePath, 'components', `Create${pascal}Dialog.vue`),
    buildDialog(pascal, fields),
    'utf8',
  )
  fs.writeFileSync(
    path.join(basePath, 'pages', `${pascal}ListPage.vue`),
    buildPage(pascal, camel, kebab, fields),
    'utf8',
  )

  return `✔ 7 files created for module "${kebab}"`
}
