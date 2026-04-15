// Programmatic smoke test for the smart module generator
// Run with: npx tsx tools/scripts/smoke-test-gen.ts

import { generateModule } from '../plop/generators/module'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as assert from 'node:assert'

// Queue of answers that the mock inquirer will return in order
const answersQueue: Record<string, unknown>[] = [
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

let queueIdx = 0

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPlop: any = {
  inquirer: {
    // Each call to prompt() pops the next answer off the queue
    prompt: async <T>(_questions: unknown): Promise<T> => {
      const answer = answersQueue[queueIdx++]
      if (!answer) throw new Error(`No more mock answers at index ${queueIdx - 1}`)
      return answer as T
    },
  },
}

const MODULE = 'borrowing'
const basePath = path.join(process.cwd(), 'src', 'modules', MODULE)

async function main() {
  // Clean up any leftover from a previous run
  if (fs.existsSync(basePath)) fs.rmSync(basePath, { recursive: true })

  console.log('Running generateModule…')
  const result = await generateModule({ name: MODULE }, undefined, mockPlop)
  console.log('Result:', result)

  const expectedFiles = [
    'index.ts',
    'types.ts',
    `api/borrowingApi.ts`,
    `stores/useBorrowingStore.ts`,
    `components/BorrowingTable.vue`,
    `components/CreateBorrowingDialog.vue`,
    `pages/BorrowingListPage.vue`,
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

  // Spot-check: BorrowingTable.vue — select badge
  const table = fs.readFileSync(path.join(basePath, 'components/BorrowingTable.vue'), 'utf8')
  assert.ok(
    table.includes("item.status === 'Active'"),
    'BorrowingTable.vue missing status badge :class condition',
  )
  console.log("  ✓ BorrowingTable.vue — status badge ':class' condition present")

  // Spot-check: BorrowingListPage.vue — filter dropdown + text search
  const page = fs.readFileSync(path.join(basePath, 'pages/BorrowingListPage.vue'), 'utf8')
  assert.ok(page.includes('statusFilter'), 'BorrowingListPage.vue missing statusFilter')
  assert.ok(
    page.includes('item.bookTitle.toLowerCase()'),
    'BorrowingListPage.vue missing bookTitle text search',
  )
  console.log('  ✓ BorrowingListPage.vue — statusFilter dropdown and bookTitle search present')

  // Spot-check: CreateBorrowingDialog.vue — AppSelect for status, FormInput type="date"
  const dialog = fs.readFileSync(
    path.join(basePath, 'components/CreateBorrowingDialog.vue'),
    'utf8',
  )
  assert.ok(dialog.includes('<AppSelect'), 'CreateBorrowingDialog.vue missing <AppSelect')
  assert.ok(dialog.includes('type="date"'), 'CreateBorrowingDialog.vue missing type="date"')
  console.log('  ✓ CreateBorrowingDialog.vue — AppSelect and date input present')

  // Clean up generated files
  fs.rmSync(basePath, { recursive: true })
  console.log('\n✅ Smoke test passed — all checks green')
}

main().catch((err: Error) => {
  console.error('\n❌ Smoke test FAILED:', err.message)
  // Clean up on failure too
  try {
    if (fs.existsSync(basePath)) fs.rmSync(basePath, { recursive: true })
  } catch {}
  process.exit(1)
})
