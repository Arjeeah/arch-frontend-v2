# CLAUDE.md — arch-frontend-v2

This file is loaded automatically by Claude Code. Follow everything here exactly — do not invent conventions.

## What this project is

ARCH is a university archive management system. This repo is the frontend admin panel.

**API base URL:** `http://64.23.135.78:8088/api` (configured in `src/app/config/env.ts`)
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
| Lucide Vue Next | latest  | Icons only                                      |

## Always use the generators — never create files by hand

```bash
npm run gen:module     # new feature module (pages + store + api + types)
npm run gen:page       # new page inside an existing module
npm run gen:component  # new shared component in src/shared/components/
npm run gen:store      # new Pinia store inside a module
npm run gen:api        # new API file inside a module
```

The generators create the correct file structure and naming automatically.

## Module boundary rule — the most important rule

```
src/modules/auth/       ✅ can import from src/shared/
src/modules/auth/       ✅ can import from src/app/
src/modules/auth/       ❌ CANNOT import from src/modules/users/
src/shared/             ❌ CANNOT import from any src/modules/
```

If you need to share code between two modules, move it to `src/shared/`. Never disable the ESLint boundary rule — fix the architecture instead.

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
- Never use `any` — use `unknown` and narrow, or define a proper type

## Design tokens — never use raw hex in templates

Always use Tailwind tokens from `tailwind.config.ts`:

| Token                    | Value   | Use for                   |
| ------------------------ | ------- | ------------------------- |
| `text-text-primary`      | #1F2937 | main text                 |
| `text-text-secondary`    | #727272 | secondary/muted text      |
| `text-text-muted`        | #B6B6B6 | placeholder-level text    |
| `bg-primary`             | #2F6FB2 | primary blue              |
| `bg-primary-mid`         | #2F6297 | darker blue (buttons)     |
| `bg-primary-dark`        | —       | sidebar/header background |
| `border-border`          | #E4E4E4 | default borders           |
| `border-border-dropdown` | #B8BBC2 | dropdown borders          |
| `font-sans`              | Inter   | body text                 |
| `font-display`           | Poppins | headings, labels          |

If you need a color not in the config, add it to `tailwind.config.ts` — don't use arbitrary values like `text-[#ABC123]`.

## Shared components — check before building new

`src/shared/components/`:

- `AppDialog` — modal with header/body/footer slots, size prop (`sm`/`md`/`lg`)
- `AppSelect` — styled native select with chevron, `v-model`, `options: {value, label}[]`
- `AppPagination` — page numbers with ellipsis, use `v-model:currentPage`
- `AppConfirmDialog` — confirm modal wrapping AppDialog
- `AppButton` — standard button
- `FormInput` — styled text input

`src/composables/`:

- `usePagination(items, perPage)` — returns `{ currentPage, totalPages, paginated, resetPage }`

## Before finishing any task

Run both and confirm they pass:

```bash
npm run lint          # oxlint + eslint (auto-fixes in place)
npm run type-check    # vue-tsc full type check
```

If either fails, fix the issues before reporting the task as done.

## Never do

- `any` type — use proper types or `unknown`
- Cross-module imports (`modules/auth` → `modules/users`)
- Raw hex in templates (`text-[#ABC]`) — use design tokens
- `<style>` blocks — Tailwind only
- Hand-create files that a generator covers
- Disable ESLint rules with `// eslint-disable` — fix the root cause
- Commit with `--no-verify` to skip hooks
