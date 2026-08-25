// Programmatic smoke test for the smart module generator
// Run with: npx tsx tools/scripts/smoke-test-gen.ts

import { generateModule } from '../plop/generators/module'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as assert from 'node:assert'

/**
 * A mock `plop.inquirer` that pops the next queued answer off the front on
 * every `prompt()` call, regardless of which question was asked. Build one
 * per `generateModule()` run so tests can't leak answers into each other.
 *
 * `node-plop`'s `NodePlopAPI` type doesn't declare `.inquirer` (the same gap
 * `generateModule` itself works around with a non-null assertion), so this
 * has to be `any` to stand in for it.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockPlop(answersQueue: Record<string, unknown>[]): any {
  let queueIdx = 0
  return {
    inquirer: {
      prompt: async <T>(_questions: unknown): Promise<T> => {
        const answer = answersQueue[queueIdx++]
        if (!answer) throw new Error(`No more mock answers at index ${queueIdx - 1}`)
        return answer as T
      },
    },
  }
}

/** Deletes a generated module dir if present. Scoped to `gen-smoke-*` names only, as a guard against ever touching a real module. */
function cleanup(moduleName: string) {
  if (!moduleName.startsWith('gen-smoke-')) {
    throw new Error(`refusing to clean up non-scratch module dir: ${moduleName}`)
  }
  const dir = path.join(process.cwd(), 'src', 'modules', moduleName)
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true })
}

async function testFullModule() {
  const MODULE = 'gen-smoke-test'
  cleanup(MODULE) // clean up any leftover from a previous failed run
  const basePath = path.join(process.cwd(), 'src', 'modules', MODULE)

  console.log('Running generateModule (full module)…')
  const answersQueue: Record<string, unknown>[] = [
    { prefix: 'academic' },
    { fieldName: 'bookTitle' },
    { fieldType: 'text' },
    { fieldName: 'status' },
    { fieldType: 'select' },
    { optionsStr: 'Active, Inactive, Overdue' },
    { isFilterable: true },
    { fieldName: 'dueDate' },
    { fieldType: 'date' },
    { fieldName: '' }, // blank → stop
  ]

  try {
    const result = await generateModule({ name: MODULE }, undefined, mockPlop(answersQueue))
    console.log('Result:', result)

    const expectedFiles = [
      'index.ts',
      'types.ts',
      'api/genSmokeTestApi.ts',
      'stores/useGenSmokeTestStore.ts',
      'components/GenSmokeTestTable.vue',
      'components/CreateGenSmokeTestDialog.vue',
      'pages/GenSmokeTestListPage.vue',
    ]

    console.log('\nChecking files…')
    for (const file of expectedFiles) {
      const filePath = path.join(basePath, file)
      assert.ok(fs.existsSync(filePath), `Missing file: ${file}`)
      console.log(`  ✓ ${file}`)
    }

    // Spot-check: types.ts
    const types = fs.readFileSync(path.join(basePath, 'types.ts'), 'utf8')
    assert.ok(types.includes('bookTitle: string'), 'types.ts missing bookTitle: string')
    assert.ok(
      types.includes("status: 'Active' | 'Inactive' | 'Overdue'"),
      'types.ts missing status union type',
    )
    assert.ok(types.includes('dueDate: string'), 'types.ts missing dueDate: string')
    console.log('\n  ✓ types.ts — correct field types')

    // Spot-check: api file — live endpoint with prefix + plural, snake_case mapping
    const api = fs.readFileSync(path.join(basePath, 'api/genSmokeTestApi.ts'), 'utf8')
    assert.ok(
      api.includes("'/v1/academic/gen-smoke-tests'"),
      'api file missing prefixed, pluralized endpoint /v1/academic/gen-smoke-tests',
    )
    assert.ok(api.includes('book_title'), 'api file missing snake_case field mapping book_title')
    assert.ok(api.includes('due_date'), 'api file missing snake_case field mapping due_date')
    assert.ok(api.includes('function fromResource'), 'api file missing fromResource mapper')
    assert.ok(api.includes('function toPayload'), 'api file missing toPayload mapper')
    console.log(
      '  ✓ api file — endpoint prefix, pluralization, and snake_case field mapping present',
    )

    // Spot-check: store — fetchAll calls the live api, no commented-out placeholder
    const store = fs.readFileSync(path.join(basePath, 'stores/useGenSmokeTestStore.ts'), 'utf8')
    assert.ok(
      store.includes('items.value = await genSmokeTestApi.listAll()'),
      'store fetchAll does not call the generated api live',
    )
    assert.ok(!store.includes('// import'), 'store still has a commented-out api import')
    assert.ok(!store.includes('// items.value'), 'store still has a commented-out api call')
    assert.ok(store.includes('async function create('), 'store missing create()')
    assert.ok(store.includes('async function update('), 'store missing update()')
    assert.ok(store.includes('async function remove('), 'store missing remove()')
    console.log('  ✓ store — fetchAll/create/update/remove all call the generated api')

    // Spot-check: BorrowingTable-style select badge (field name generic here)
    const table = fs.readFileSync(path.join(basePath, 'components/GenSmokeTestTable.vue'), 'utf8')
    assert.ok(
      table.includes("item.status === 'Active'"),
      'Table.vue missing status badge :class condition',
    )
    console.log("  ✓ Table.vue — status badge ':class' condition present")

    // Spot-check: page — fetches on mount, wires create/update/delete through the
    // store (i.e. the api file), and reports mutations via toasts
    const page = fs.readFileSync(path.join(basePath, 'pages/GenSmokeTestListPage.vue'), 'utf8')
    assert.ok(page.includes('statusFilter'), 'ListPage.vue missing statusFilter')
    assert.ok(
      page.includes('item.bookTitle.toLowerCase()'),
      'ListPage.vue missing bookTitle text search',
    )
    assert.ok(
      page.includes("import { useToasts } from '@/shared/composables/useToasts'"),
      'ListPage.vue does not import useToasts',
    )
    assert.ok(page.includes('const toasts = useToasts()'), 'ListPage.vue does not call useToasts()')
    assert.ok(page.includes('await store.fetchAll()'), 'ListPage.vue does not fetch on mount')
    assert.ok(page.includes('await store.create('), 'ListPage.vue does not call store.create')
    assert.ok(page.includes('await store.update('), 'ListPage.vue does not call store.update')
    assert.ok(page.includes('await store.remove('), 'ListPage.vue does not call store.remove')
    assert.ok(page.includes('toasts.success('), 'ListPage.vue never reports success via toasts')
    assert.ok(page.includes('toasts.error('), 'ListPage.vue never reports failure via toasts')
    assert.ok(
      !page.includes('store.items.splice') && !page.includes('store.items.unshift'),
      'ListPage.vue still mutates store.items directly instead of going through the api',
    )
    console.log(
      '  ✓ ListPage.vue — fetches on mount, CRUD wired through the store/api, toasts wired',
    )

    // Spot-check: dialog — AppSelect for status, FormInput type="date"
    const dialog = fs.readFileSync(
      path.join(basePath, 'components/CreateGenSmokeTestDialog.vue'),
      'utf8',
    )
    assert.ok(dialog.includes('<AppSelect'), 'Dialog.vue missing <AppSelect')
    assert.ok(dialog.includes('type="date"'), 'Dialog.vue missing type="date"')
    console.log('  ✓ Dialog.vue — AppSelect and date input present')
  } finally {
    cleanup(MODULE)
  }
}

/** Endpoint-prefix cases: none / academic / location produce the right base path. */
async function testEndpointPrefixes() {
  console.log('\nRunning generateModule (endpoint prefixes)…')
  const cases: Array<{ prefix: string; expected: string }> = [
    { prefix: 'none', expected: "'/v1/gen-smoke-widgets'" },
    { prefix: 'academic', expected: "'/v1/academic/gen-smoke-widgets'" },
    { prefix: 'location', expected: "'/v1/location/gen-smoke-widgets'" },
  ]

  for (const { prefix, expected } of cases) {
    const MODULE = 'gen-smoke-widget'
    cleanup(MODULE)
    try {
      await generateModule({ name: MODULE }, undefined, mockPlop([{ prefix }, { fieldName: '' }]))
      const api = fs.readFileSync(
        path.join(process.cwd(), 'src', 'modules', MODULE, 'api/genSmokeWidgetApi.ts'),
        'utf8',
      )
      assert.ok(api.includes(expected), `prefix "${prefix}" did not produce endpoint ${expected}`)
      console.log(`  ✓ prefix "${prefix}" -> ${expected}`)
    } finally {
      cleanup(MODULE)
    }
  }
}

/** Pluralization cases, including the double-plural bug this generator used to have. */
async function testPluralization() {
  console.log('\nRunning generateModule (pluralization)…')
  const cases: Array<{ module: string; expected: string }> = [
    // consonant + y -> ies
    { module: 'gen-smoke-category', expected: 'gen-smoke-categories' },
    // already plural (ends in s) -> left alone, must NOT double to "...categoriess"
    { module: 'gen-smoke-categories', expected: 'gen-smoke-categories' },
    // sibilant -> +es
    { module: 'gen-smoke-box', expected: 'gen-smoke-boxes' },
    // regular -> +s
    { module: 'gen-smoke-report', expected: 'gen-smoke-reports' },
  ]

  for (const { module, expected } of cases) {
    cleanup(module)
    try {
      await generateModule(
        { name: module },
        undefined,
        mockPlop([{ prefix: 'none' }, { fieldName: '' }]),
      )
      const camel = module
        .split('-')
        .map((s, i) => (i === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1)))
        .join('')
      const api = fs.readFileSync(
        path.join(process.cwd(), 'src', 'modules', module, 'api', `${camel}Api.ts`),
        'utf8',
      )
      assert.ok(
        api.includes(`'/v1/${expected}'`),
        `module "${module}" expected plural "${expected}", got: ${api.match(/'\/v1\/[^']+'/)?.[0]}`,
      )
      console.log(`  ✓ "${module}" -> "${expected}"`)
    } finally {
      cleanup(module)
    }
  }
}

async function main() {
  await testFullModule()
  await testEndpointPrefixes()
  await testPluralization()
  console.log('\n✅ Smoke test passed — all checks green')
}

main().catch((err: Error) => {
  console.error('\n❌ Smoke test FAILED:', err.message)
  process.exit(1)
})
