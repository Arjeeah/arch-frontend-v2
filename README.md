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
npm run gen:page      # new page inside an existing module
npm run gen:component # new shared component
npm run gen:store     # new Pinia store
npm run gen:api       # new API file
```

### `gen:module` — smart module generator

The module generator is fully interactive. It asks for each field one at a time. Leave the field name blank to finish and generate all files.

**Example session:**

```
? Module name (kebab-case): borrowing

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

**Generated files:**

```
src/modules/borrowing/
  index.ts                             — module entrypoint
  types.ts                             — TypeScript interface with all fields
  api/borrowingApi.ts                  — full CRUD (list, show, create, update, delete)
  stores/useBorrowingStore.ts          — Pinia store
  components/BorrowingTable.vue        — table with select badges + skeleton loading
  components/CreateBorrowingDialog.vue — create/edit form with validation
  pages/BorrowingListPage.vue          — search, filters, pagination, dialogs
```

**Field types:**

| Type     | TypeScript       | Table          | Dialog input    |
| -------- | ---------------- | -------------- | --------------- |
| `text`   | `string`         | truncated text | text input      |
| `number` | `number`         | truncated text | number input    |
| `date`   | `string`         | truncated text | date picker     |
| `select` | union of options | colored badge  | dropdown select |

After generation, register the new page in `src/app/router/index.ts` and add a nav item in `src/shared/components/AppSidebar.vue`.

## CI / quality gates

Every push and pull request runs:

1. **Lint** (`npm run lint`) — oxlint + ESLint with boundary checks
2. **Format check** (`prettier --check`) — Prettier formatting
3. **Type check** (`npm run type-check`) — vue-tsc full check
4. **Build** (`npm run build`) — production Vite build

Pre-commit hooks (Husky + lint-staged) run lint + format automatically on staged files. Pre-push runs `vue-tsc --build`. Fix any issues before pushing.

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before writing any code.

## Design

Figma designs are shared privately with team members. Ask Arjeeah for access.
