# ARCH Frontend

Admin panel for the ARCH university archive management system.

Built with Vue 3, Vite, TypeScript, and Tailwind CSS.

## Prerequisites

- **Node.js** v20.19 or later (v22 recommended) — [download](https://nodejs.org/)
- **VS Code** — [download](https://code.visualstudio.com/)
  - Install the [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) extension
  - Disable Vetur if you have it installed

## Quick start

```bash
git clone https://github.com/Arjeeah/arch-frontend-v2.git
cd arch-frontend-v2
npm install          # also installs git hooks automatically
npm run dev          # http://localhost:5173
```

> **Note:** `npm install` sets up git hooks automatically via Husky. You don't need to do anything extra.

## Useful commands

```bash
npm run dev          # start dev server
npm run build        # type-check + production build
npm run lint         # lint and auto-fix
npm run type-check   # TypeScript check only
```

## Code generators

**Never create module files by hand.** Always use the generators:

```bash
npm run gen:module    # new feature module (interactive — asks for fields)
npm run gen:component # new shared component
```

> `gen:page`, `gen:store`, and `gen:api` were removed — they pointed at
> Handlebars templates that no longer exist. `gen:module` scaffolds a
> complete module (page, store, api, table, dialog) in one pass; there is no
> supported way to add a lone page/store/api file to an existing module
> through the generator today.

### `gen:module` — smart module generator

The module generator is fully interactive. First it asks which endpoint
prefix the module's API lives under, then it asks for each field one at a
time. Leave the field name blank to finish and generate all files.

**Example session:**

```
? Module name (kebab-case): borrowing
? Endpoint prefix: academic

? Field name (camelCase, blank to finish): bookTitle
? Field type: text

? Field name (camelCase, blank to finish): status
? Field type: select
? Options (comma-separated): Active, Inactive, Overdue
? Show as filter dropdown? Yes

? Field name (camelCase, blank to finish): dueDate
? Field type: date

? Field name (camelCase, blank to finish):   ← blank to finish

✔ 7 files created for module "borrowing"
```

**Endpoint prefix** picks the base path the generated api file calls:
`none` → `/v1/<plural>`, `academic` → `/v1/academic/<plural>`, `location` →
`/v1/location/<plural>`. The module name is pluralized for you (a tiny
built-in pluralizer — handles trailing `s`/`y` correctly, so naming the
module `faculty` produces `/v1/academic/faculties`, and naming it already
plural, e.g. `faculties`, doesn't double-pluralize into `facultiess`).

**Generated files:**

```
src/modules/borrowing/
  index.ts                             — module entrypoint
  types.ts                             — TypeScript interface with all fields
  api/borrowingApi.ts                  — full CRUD, snake_case <-> camelCase field mapping
  stores/useBorrowingStore.ts          — Pinia store (fetchAll/create/update/remove call the api)
  components/BorrowingTable.vue        — table with select badges + skeleton loading
  components/CreateBorrowingDialog.vue — create/edit form with validation
  pages/BorrowingListPage.vue          — fetches on mount; create/update/delete go through
                                          the store (→ api); mutations report via useToasts
```

Everything the generator produces is live: the store's `fetchAll` really
calls the generated api, and the list page's create/update/delete actions go
through the store rather than mutating a local array. No manual rewiring is
needed before the module talks to the backend — only `verify against live
API` comments left in the api file for things the generator can't know
(exact wire casing of select-field values, etc.).

**Field types:**

| Type     | TypeScript       | Table          | Dialog input    |
| -------- | ---------------- | -------------- | --------------- |
| `text`   | `string`         | truncated text | text input      |
| `number` | `number`         | truncated text | number input    |
| `date`   | `string`         | truncated text | date picker     |
| `select` | union of options | colored badge  | dropdown select |

After generation, register the new page in `src/app/router/index.ts` and add a nav item in `src/shared/components/AppSidebar.vue`.

The generator logic lives in `tools/plop/generators/module.ts` and is
covered by `tools/scripts/smoke-test-gen.ts` (`npx tsx
tools/scripts/smoke-test-gen.ts`), which CI runs on every push/PR.

## CI / quality gates

Every push and pull request runs:

1. **Lint** (`npm run lint:check`) — oxlint + ESLint with boundary checks, no auto-fix (CI never mutates code; use `npm run lint` locally to auto-fix)
2. **Format check** (`prettier --check`) — Prettier formatting
3. **Type check** (`npm run type-check`) — vue-tsc full check
4. **Generator smoke test** (`npx tsx tools/scripts/smoke-test-gen.ts`) — proves `gen:module` still produces working output
5. **Build** (`npm run build`) — production Vite build

Pre-commit hooks (Husky + lint-staged) run lint + format automatically on staged files. Pre-push runs `vue-tsc --build`. Fix any issues before pushing.

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before writing any code.

## Design

Figma designs are shared privately with team members. Ask Arjeeah for access.
