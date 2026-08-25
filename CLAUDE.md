# CLAUDE.md — arch-frontend-v2

This file is loaded automatically by Claude Code. Follow everything here exactly — do not invent conventions.

## What this project is

ARCH is a university archive management system. This repo is the frontend admin panel.

**API base URL:** `https://arch-os-server.tailf7bd4c.ts.net/api` (default in `src/app/config/env.ts`)
**Override:** set `VITE_API_BASE_URL` in a local `.env.local` file to point at a different backend (file is gitignored — see `.env.example`)
**Dev server:** `npm run dev` → `http://localhost:5173`

## Stack

| Tool            | Version | Purpose                                         |
| --------------- | ------- | ----------------------------------------------- |
| Vue 3           | 3.5     | UI framework (`<script setup lang="ts">` only)  |
| Vite            | 8       | Build tool                                      |
| TypeScript      | 6       | Types everywhere, no `any`                      |
| Tailwind CSS    | 3.4     | Styling — no `<style>` blocks                   |
| Pinia           | 3       | State management                                |
| Axios           | 1.x     | HTTP — configured in `src/app/plugins/axios.ts` |
| Vue Router      | 5       | Routing — defined in `src/app/router/index.ts`  |
| vue-i18n        | 9       | Translations — files in `src/locales/`          |
| Chart.js        | 4       | Charts via `vue-chartjs` wrapper                |
| Lucide Vue Next | latest  | Icons only                                      |
| Plop            | 4       | Code generators — `tools/plop/`                 |

## Always use the generators — never create files by hand

```bash
npm run gen:module     # new feature module (interactive — asks for fields)
npm run gen:component  # new shared component in src/shared/components/
```

`gen:page`, `gen:store`, and `gen:api` do not exist — they were removed
because they pointed at Handlebars templates deleted long ago. `gen:module`
is the only way to scaffold module code; there is no generator today for
adding a single page/store/api file to an already-existing module.

### Smart module generator (`gen:module`)

The module generator is interactive. After entering the module name it asks for the endpoint prefix (`none` / `academic` / `location`), then loops, asking for each field until you leave the name blank:

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

? Field name (camelCase, blank to finish): [blank — done]

✔ 7 files created for module "borrowing"
```

**What each field type generates:**

| Field type | TypeScript type        | Table cell     | Dialog input              |
| ---------- | ---------------------- | -------------- | ------------------------- |
| `text`     | `string`               | truncated span | `FormInput`               |
| `number`   | `number`               | truncated span | `FormInput type="number"` |
| `date`     | `string`               | truncated span | `FormInput type="date"`   |
| `select`   | `'Opt1' \| 'Opt2' \|…` | colored badge  | `AppSelect`               |

**Select badge colors:** first option → green (`bg-[#E8F5E9] text-[#2E7D32]`), all others → grey (`bg-surface text-text-secondary`).

**Filter dropdowns** are generated only for `select` fields marked filterable.

**Search** filters across all `text` fields.

**Generated files** (7 per module):

```
src/modules/{name}/
  index.ts                              — module entrypoint (re-exports)
  types.ts                              — TypeScript interface
  api/{camel}Api.ts                     — full CRUD, snake_case <-> camelCase field mapping
                                           (endpoint: /v1/{prefix}/{pluralized name})
  stores/use{Pascal}Store.ts            — Pinia store; fetchAll/create/update/remove call the api
  components/{Pascal}Table.vue          — flex-row table with skeleton + badges
  components/Create{Pascal}Dialog.vue   — AppDialog form with validation
  pages/{Pascal}ListPage.vue            — fetches on mount; create/update/delete go through
                                           the store (→ api); mutations report via useToasts
```

Nothing needs manual rewiring after generation — the store's `fetchAll` calls the generated api live, and the page's create/update/delete call the store rather than mutating a local array.

The generator logic lives in `tools/plop/generators/module.ts`, covered by `tools/scripts/smoke-test-gen.ts` (`npx tsx tools/scripts/smoke-test-gen.ts`, run in CI). To add a new field type, add a branch in each `buildX()` function there.

## Module boundary rule — the most important rule

```
src/modules/auth/       ✅ can import from src/shared/
src/modules/auth/       ✅ can import from src/app/
src/modules/auth/       ❌ CANNOT import from src/modules/users/
src/shared/             ❌ CANNOT import from any src/modules/
src/app/router/         ✅ CAN import from any src/modules/ (router wires up pages)
```

The rule is enforced by `eslint-plugin-boundaries` in `eslint.config.ts`. The router (`src/app/router/index.ts`) is the one legitimate place where `app` imports module pages — this is intentional. All other cross-module imports are forbidden.

If you need to share code between two modules, move it to `src/shared/`. Never add `eslint-disable` comments — fix the architecture instead.

## Auth, roles and routing

- Never read or write `auth_token` / `auth_user` directly. `src/app/config/authStorage.ts` is the only module that touches them; the store, the axios interceptors and the router guard all import it.
- `src/app/plugins/axios.ts` handles 401 globally (clear the session + redirect to `/login`). Modules must not add their own 401 branches — catch a failed request and show a toast, nothing more.
- Route access is declared as `meta: { roles: ['super_admin'] }` in `src/app/router/index.ts`. Omit the `roles` key to allow every authenticated role; never write `roles: []` — it locks everyone out. An unauthorised role is redirected to `/dashboard`, which must stay open to all roles.
- Backend role slugs, exactly three: `super_admin`, `archivist`, `faculty_staff` (`AUTH_ROLES` / `UserRole` in `src/modules/auth/types`).
- A new route needs a matching `AppSidebar` entry with the same `roles`; the sidebar filters its tree recursively.

## i18n and RTL

- Every user-facing string in shell chrome goes through `t()`; add the key to **both** `src/locales/en.json` and `src/locales/ar.json` in the same commit — a missing Arabic key silently falls back to English.
- `setLocale()` in `src/app/plugins/i18n.ts` is the only way to switch language. It persists to `localStorage['app_locale']` and sets `<html lang>` + `<html dir>`.
- RTL is driven entirely by `<html dir>`. **New markup uses logical Tailwind utilities** — `ps-`/`pe-`/`ms-`/`me-`/`start-`/`end-`/`text-start`/`text-end` — never `pl-`/`pr-`/`ml-`/`mr-`/`left-`/`right-`/`text-left`. Tailwind 3.4 supports them natively. Retrofit existing physical classes as you touch a file, not big-bang.
- `shared/` components cannot import `src/app/` (boundaries rule), so they take locale-affecting actions by emitting an event the layout handles — see `AppHeader`'s `locale-change`.

## Naming conventions

| Thing               | Convention               | Example                          |
| ------------------- | ------------------------ | -------------------------------- |
| Vue component files | PascalCase               | `UserTable.vue`                  |
| Page components     | `<Name>Page.vue`         | `UserListPage.vue`               |
| Shared components   | `App` prefix             | `AppDialog.vue`, `AppSelect.vue` |
| Composables         | `use` prefix             | `usePagination.ts`               |
| Pinia stores        | `use` + `Store` suffix   | `useUsersStore.ts`               |
| API files           | camelCase + `Api` suffix | `usersApi.ts`                    |
| All other files     | kebab-case               | `mock-users.ts`                  |

## Vue component rules

- Always `<script setup lang="ts">` — never Options API, never `<script>` without setup
- No `<style>` blocks — use Tailwind classes only
- Type props with interfaces: `defineProps<{ open: boolean; title?: string }>()`
- Use `withDefaults` for optional props with defaults
- Use `defineEmits<{ close: []; save: [data: User] }>()` — always typed
- Never use `any` — use `unknown` and narrow, or define a proper type. In `catch` blocks use `const e = err as { response?: ... }` instead of `catch (err: any)`

## Design tokens — always prefer tokens over raw values

Always use Tailwind tokens from `tailwind.config.ts`:

| Token                    | Value   | Use for                   |
| ------------------------ | ------- | ------------------------- |
| `text-text-primary`      | #1F2937 | main text                 |
| `text-text-secondary`    | #727272 | secondary/muted text      |
| `text-text-muted`        | #B6B6B6 | placeholder-level text    |
| `bg-primary`             | #2F6FB2 | primary blue              |
| `bg-primary-mid`         | #2F6297 | darker blue (buttons)     |
| `bg-primary-dark`        | #30476D | sidebar/header background |
| `border-border`          | #E4E4E4 | default borders           |
| `border-border-dropdown` | #B8BBC2 | dropdown borders          |
| `font-sans`              | Inter   | body text                 |
| `font-display`           | Poppins | headings, labels          |

**Known exceptions** — these raw values are used consistently across the codebase and are part of the established design:

| Raw value        | Used for                                 |
| ---------------- | ---------------------------------------- |
| `text-[#4285F4]` | edit action icon (blue)                  |
| `bg-[#E8F5E9]`   | select badge background — "active" state |
| `text-[#2E7D32]` | select badge text — "active" state       |
| `text-[#6F6F6F]` | dialog subtitle / helper text            |
| `bg-[#C0D4E9]`   | cancel button background                 |

If you need a color not in either table above, add it to `tailwind.config.ts` — don't introduce new arbitrary values.

## Shared components — check before building new

`src/shared/components/`:

- `AppDialog` — modal with header/body/footer slots, size prop (`sm`/`md`/`lg`)
- `AppSelect` — styled native select with chevron, `v-model`, `options: {value, label}[]`
- `AppPagination` — page numbers with ellipsis, use `v-model:currentPage` + `:total-pages`
- `AppConfirmDialog` — confirm modal wrapping AppDialog, emits `confirm` and `close`
- `AppButton` — standard button
- `FormInput` — styled text input, always emits `string` (cast to `Number()` for number fields)
- `FormField` — label + input wrapper with error message slot
- `SearchBar` — search input with magnifier icon
- `FilterDropdown` — dropdown filter (use `AppSelect` for new filters instead)
- `DataTable` — generic `<table>` shell with column definitions and a `#rows` slot for `<tr>` elements
- `StatusBadge` — coloured pill badge for status values
- `AppHeader` — top header bar (do not duplicate)
- `AppSidebar` — left navigation sidebar (do not duplicate)
- `SidebarNavItem` — single nav item used inside AppSidebar
- `AppToastHost` — renders the toast queue. Already mounted once in `src/App.vue`; never mount another one in a page or layout
- `AppFileUpload` — drag/drop + picker, `v-model:files` (`File[]`), `accept` / `maxSizeMb` / `maxFiles` / `multiple`, optional `progress: Record<fileName, number>`, emits `error: [messages: string[]]`
- `AppAsyncSelect` — typeahead select; v-models an **option object** (`{ value, label } | null`, not a bare id) and takes `searchFn: (query) => Promise<{value,label}[]>`, `minChars` (2), `debounceMs` (300)
- `AppEmptyState` — "nothing here yet" placeholder for empty lists
- `AppErrorState` — failed-request placeholder with a retry action

`src/shared/composables/`:

- `useToasts()` — app-wide queue: `{ toasts, success, error, info, dismiss, clear }`; each helper is `(message, duration?)` and returns the toast id. `duration: 0` keeps a toast until dismissed. This is the only way to report a mutation's outcome — do not build per-page banners
- `useDebouncedRef(source, delay = 300)` — **derives** a read-only ref from an existing one (`const q = ref(''); const dq = useDebouncedRef(q)`); it is not a self-debouncing writable ref
- `useServerTable(fetcher, { perPage, filters, immediate })` — server-paginated list state: `{ rows, loading, error, page, perPage, total, totalPages, filters, isEmpty, setFilters, resetFilters, refresh }`. Sends `{ ...filters, page, per_page }`; `setFilters` resets to page 1 and issues exactly one request

`src/shared/utils/`:

- `apiError.ts` — `getApiErrorMessage(err)`, the message every `catch` block should pass to `toasts.error()`
- `casing.ts` — `keysToCamel` / `keysToSnake`, deep and array-aware (`Date`/`File`/`Blob`/`FormData` pass through untouched)
- `date.ts` — `formatDate` and `relativeTime(value, locale?)`

`src/composables/` (legacy location, client-side paging only):

- `usePagination(items, perPage?)` — returns `{ currentPage, totalPages, paginated, resetPage }`. Accepts `Ref<T[]>` or `ComputedRef<T[]>`. Always call `watch([search, ...filters], resetPage)` when filters change. For a backend-paginated list use `useServerTable` instead.

### Using DataTable

```vue
<DataTable :columns="columns">
  <template #rows>
    <tr v-for="row in rows" :key="row.id" class="border-t border-border hover:bg-surface">
      <td class="px-5 py-3 text-sm font-sans">{{ row.field }}</td>
    </tr>
  </template>
</DataTable>
```

Where `columns` is `Array<{ key: string; label: string; align?: 'left'|'center'|'right' }>`.

## Project structure

```
src/
  app/           — router, plugins, layouts, global config
  modules/       — feature modules (auth, dashboard, users, …)
    {name}/
      index.ts          — public re-exports
      types.ts          — TypeScript interfaces
      api/              — axios calls
      stores/           — Pinia stores
      components/       — module-private components
      pages/            — routed page components
  shared/
    components/   — reusable UI components (App* prefix)
    composables/  — shared composables (useToasts, useDebouncedRef, useServerTable)
    utils/        — framework-free helpers (apiError, casing, date)
  composables/    — legacy composable location (usePagination only)
  locales/        — i18n translation files (en.json + ar.json, keys kept in sync)
tools/
  plop/
    generators/   — generator TypeScript logic (module.ts)
    templates/    — Handlebars templates (component only)
```

## Before finishing any task

Run both and confirm they pass:

```bash
npm run lint          # oxlint + eslint (auto-fixes in place)
npm run type-check    # vue-tsc full type check
```

If either fails, fix the issues before reporting the task as done.

## Never do

- `any` type — use proper types or `unknown`
- Cross-module imports (`modules/auth` → `modules/users`) — move shared code to `src/shared/`
- New arbitrary hex values in templates — use tokens from the tables above
- `<style>` blocks — Tailwind only
- Hand-create files that a generator covers (`gen:module`, `gen:component`)
- `eslint-disable` comments — fix the root cause
- `git commit --no-verify` to skip hooks
- Inline raw `<table>` / `<thead>` / `<tbody>` in new components — use `DataTable` instead
- `localStorage.getItem('auth_token')` and friends — go through `src/app/config/authStorage.ts`
- Per-module 401 handling — the axios response interceptor already does it
- Physical direction utilities (`pl-`, `mr-`, `left-`, `text-left`) in new markup — use the logical ones so RTL works
- A second `AppToastHost` — one is already mounted in `src/App.vue`
