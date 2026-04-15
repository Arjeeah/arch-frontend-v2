# Contributing

Welcome to the team! Read this before writing any code.

## The one rule

If a piece of code is used by **one feature**, put it in `src/modules/<that-feature>/`.
If it's used by **two or more features**, put it in `src/shared/`.

If you're unsure, ask Arjeeah.

## Folder structure

```
src/
├── modules/           # one folder per feature
│   └── <feature>/
│       ├── pages/     # route-level views (<Name>Page.vue)
│       ├── components/# components used only by this feature
│       ├── stores/    # Pinia state (useNameStore.ts)
│       ├── api/       # HTTP calls (nameApi.ts)
│       └── types.ts   # TypeScript types
├── shared/
│   ├── components/    # reusable UI — prefix with App (AppDialog, AppSelect…)
│   ├── composables/   # reusable hooks (usePagination…)
│   └── utils/         # pure helpers
├── composables/       # app-level composables
└── app/
    ├── router/        # route definitions
    ├── layouts/       # page layout shells
    ├── plugins/       # axios, i18n setup
    └── config/        # env variables
```

## Always use the generators

Don't create files by hand. Run the generator for what you need:

| What                 | Command                 |
| -------------------- | ----------------------- |
| New feature module   | `npm run gen:module`    |
| New page in a module | `npm run gen:page`      |
| New Pinia store      | `npm run gen:store`     |
| New shared component | `npm run gen:component` |
| New API file         | `npm run gen:api`       |

## Naming conventions

| Thing                | Convention               | Example            |
| -------------------- | ------------------------ | ------------------ |
| Vue component files  | PascalCase               | `UserTable.vue`    |
| Page components      | `<Name>Page.vue` suffix  | `UserListPage.vue` |
| Shared UI components | `App` prefix             | `AppDialog.vue`    |
| Composables          | `use` prefix             | `usePagination.ts` |
| Pinia stores         | `use` + `Store` suffix   | `useUsersStore.ts` |
| API files            | camelCase + `Api` suffix | `usersApi.ts`      |
| Everything else      | kebab-case               | `mock-users.ts`    |

## Vue rules

- **Always** `<script setup lang="ts">` — never Options API
- **No `<style>` blocks** — use Tailwind classes only
- **No `any`** — define a proper type or use `unknown`
- **Design tokens only** — use `text-text-primary`, `bg-primary`, etc. from `tailwind.config.ts`. Never raw hex like `text-[#ABC123]`
- Check `src/shared/components/` before building a new component — it may already exist

## What ESLint will block

- A module importing from another module (e.g. `auth/` importing from `users/`). Fix: move the shared code to `src/shared/`.
- Shared code importing from a module. Fix: shared code must not depend on a specific feature.

If lint blocks you and you're stuck, ask — those conversations are the point of the club. **Never use `--no-verify` to skip the hooks.**

## Git workflow

**Branch naming:**

- `feat/what-you-are-adding` — new feature
- `fix/what-you-are-fixing` — bug fix
- `chore/what-you-are-doing` — tooling, deps, config

**Commit message format:**

```
feat: add user table with pagination
fix: truncate long names in table row
chore: update husky to v9
```

One line, lowercase, present tense, no period at the end.

## What the git hooks do

When you commit, **Husky runs automatically** — you don't need to do anything:

1. **Pre-commit** (fast, ~2 seconds): runs oxlint + ESLint + Prettier on your staged files only. Simple issues are auto-fixed and re-staged. If a real error remains, the commit is blocked with a clear message telling you exactly what to fix.

2. **Pre-push** (~10 seconds): runs the full TypeScript type-check before your code reaches GitHub. This catches type errors that ESLint misses.

If a hook fails: read the error message, fix the problem, `git add` the fix, then try committing again.

## Submitting a PR

1. Branch from `main`: `git checkout -b feat/your-feature-name`
2. One feature per PR. Smaller is better.
3. `npm run lint` and `npm run build` must both pass (the hooks ensure this, but double-check)
4. Open a PR — GitHub will run CI automatically
5. Wait for 1 approval + green CI before merging
6. Never merge your own PR without a review

## Running the project

```bash
npm install       # install deps + set up git hooks
npm run dev       # dev server at http://localhost:5173
npm run build     # production build
npm run lint      # lint and auto-fix
npm run type-check # TypeScript check
```
