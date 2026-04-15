# Contribution Guide & Enforcement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up Husky git hooks, GitHub Actions CI, CLAUDE.md, and updated docs so every team member — human or AI — produces consistent, quality code from day one.

**Architecture:** Husky v9 + lint-staged handle local enforcement (auto-fix on commit, type-check on push). A GitHub Actions workflow enforces the same checks on every PR. CLAUDE.md gives Claude Code full project context. README and CONTRIBUTING docs are updated to be beginner-friendly and specific to this project.

**Tech Stack:** Vue 3, Vite, TypeScript, Tailwind CSS, Husky v9, lint-staged, GitHub Actions

---

### Task 1: Install Husky + lint-staged and wire the pre-commit hook

**Files:**
- Modify: `package.json` (adds `prepare` script + `lint-staged` config)
- Create: `.husky/pre-commit`

**Step 1: Install packages**

```bash
cd /Users/arjytalzwy/Desktop/UNI/google/arch-frontend-v2
npm install --save-dev husky lint-staged
```

Expected: husky and lint-staged appear in `devDependencies` in `package.json`.

**Step 2: Initialize Husky**

```bash
npx husky init
```

Expected: `.husky/pre-commit` is created with a placeholder, and `"prepare": "husky"` is added to `package.json` scripts.

**Step 3: Replace the pre-commit hook content**

Edit `.husky/pre-commit` so it contains exactly this (replacing whatever `husky init` put there):

```sh
npx lint-staged
```

**Step 4: Add lint-staged config to package.json**

In `package.json`, add a top-level `"lint-staged"` key (alongside `"scripts"`, `"dependencies"`, etc.):

```json
"lint-staged": {
  "*.{vue,ts}": [
    "oxlint --fix",
    "eslint --fix"
  ],
  "*.{vue,ts,css,json,md}": [
    "prettier --write"
  ]
}
```

**Step 5: Verify the hook works**

Make a trivial whitespace change to any `.ts` file (e.g. add a blank line), stage it, and commit:

```bash
git add src/composables/usePagination.ts
git commit -m "chore: test pre-commit hook"
```

Expected: You see lint-staged output (oxlint, eslint, prettier running on staged files). Commit succeeds. Revert the test commit afterwards:

```bash
git revert HEAD --no-edit
```

**Step 6: Commit the hook setup**

```bash
git add .husky/pre-commit package.json package-lock.json
git commit -m "chore: add husky pre-commit hook with lint-staged"
```

---

### Task 2: Add pre-push hook for type-check

**Files:**
- Create: `.husky/pre-push`

**Step 1: Create the pre-push hook**

Create `.husky/pre-push` with this content:

```sh
npm run type-check
```

**Step 2: Make it executable**

```bash
chmod +x /Users/arjytalzwy/Desktop/UNI/google/arch-frontend-v2/.husky/pre-push
```

**Step 3: Verify the hook works**

```bash
git push --dry-run 2>&1 || true
```

Or make a small valid change, commit it, then push — you should see `vue-tsc --build` run before the push goes through.

**Step 4: Commit**

```bash
git add .husky/pre-push
git commit -m "chore: add husky pre-push hook for type-check"
```

---

### Task 3: Create GitHub Actions CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

**Step 1: Create the directory**

```bash
mkdir -p /Users/arjytalzwy/Desktop/UNI/google/arch-frontend-v2/.github/workflows
```

**Step 2: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    name: Lint, Type-check & Build
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type-check
        run: npm run type-check

      - name: Build
        run: npm run build
```

**Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow for lint, type-check, and build"
```

**Step 4: After pushing to GitHub — enable branch protection (manual)**

Go to the GitHub repo → Settings → Branches → Add branch protection rule for `main`:
- Check: "Require a pull request before merging"
- Check: "Require status checks to pass before merging"
- Search for and add: `Lint, Type-check & Build`
- Check: "Require branches to be up to date before merging"
- Check: "Require approvals" → set to 1

This is a manual step in the GitHub UI — it cannot be done from code.

---

### Task 4: Create CLAUDE.md

**Files:**
- Create: `CLAUDE.md`

**Step 1: Create `CLAUDE.md` at the repo root**

```markdown
# CLAUDE.md — arch-frontend-v2

This file is loaded automatically by Claude Code. Follow everything here exactly — do not invent conventions.

## What this project is

ARCH is a university archive management system. This repo is the frontend, built for the admin panel.

**API base URL:** `http://64.23.135.78:8088/api` (configured in `src/app/config/env.ts`)
**Dev server:** `npm run dev` → `http://localhost:5173`

## Stack

| Tool | Version | Purpose |
|---|---|---|
| Vue 3 | 3.5 | UI framework (`<script setup lang="ts">` only) |
| Vite | 8 | Build tool |
| TypeScript | 6 | Types everywhere, no `any` |
| Tailwind CSS | 3.4 | Styling — no `<style>` blocks |
| Pinia | 3 | State management |
| Axios | 1.x | HTTP — configured in `src/app/plugins/axios.ts` |
| Vue Router | 5 | Routing — defined in `src/app/router/index.ts` |
| Lucide Vue Next | latest | Icons only |

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

| Thing | Convention | Example |
|---|---|---|
| Vue component files | PascalCase | `UserTable.vue` |
| Page components | `<Name>Page.vue` | `UserListPage.vue` |
| Shared components | `App` prefix | `AppDialog.vue`, `AppSelect.vue` |
| Composables | `use` prefix | `usePagination.ts` |
| Pinia stores | `use` + `Store` suffix | `useUsersStore.ts` |
| API files | camelCase + `Api` | `usersApi.ts` |
| All other files | kebab-case | `mock-users.ts` |

## Vue component rules

- Always `<script setup lang="ts">` — never Options API, never `<script>` without setup
- No `<style>` blocks — use Tailwind classes only
- Type props with interfaces: `defineProps<{ open: boolean; title?: string }>()`
- Use `withDefaults` for optional props with defaults
- Use `defineEmits<{ close: []; save: [data: User] }>()` — always typed
- Never use `any` — use `unknown` and narrow, or define a proper type

## Design tokens — never use raw hex in templates

Always use Tailwind tokens from `tailwind.config.ts`:

```
text-text-primary       (#1F2937)   main text
text-text-secondary     (#727272)   secondary/muted text
text-text-muted         (#B6B6B6)   placeholder-level text
bg-primary              (#2F6FB2)   primary blue
bg-primary-mid          (#2F6297)   darker blue (buttons)
bg-primary-dark                     sidebar/header background
border-border           (#E4E4E4)   default borders
border-border-dropdown  (#B8BBC2)   dropdown borders
font-sans                           Inter (body text)
font-display                        Poppins (headings, labels)
```

If you need a color not in the config, add it to `tailwind.config.ts` — don't use arbitrary values like `text-[#ABC123]`.

## Shared components — use before building new

Check `src/shared/components/` first. Available:

- `AppDialog` — modal dialog with header/body/footer slots
- `AppSelect` — styled native select with chevron
- `AppPagination` — paginated page numbers with ellipsis (use with `usePagination`)
- `AppConfirmDialog` — confirmation dialog wrapping AppDialog
- `AppButton` — standard button
- `FormInput` — styled text input

Composables in `src/composables/` and `src/shared/composables/`:
- `usePagination(items, perPage)` — returns `{ currentPage, totalPages, paginated, resetPage }`

## Before finishing any task

Run both of these and confirm they pass:

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
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md with full project conventions for Claude Code"
```

---

### Task 5: Rewrite README.md

**Files:**
- Modify: `README.md`

**Step 1: Replace the entire content of `README.md`**

```markdown
# ARCH Frontend

Admin panel for the ARCH university archive management system.

Built with Vue 3, Vite, TypeScript, and Tailwind CSS.

## Prerequisites

- **Node.js** v22 or later — [download](https://nodejs.org/)
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

# Code generators (always use these instead of creating files by hand)
npm run gen:module   # new feature module
npm run gen:page     # new page in a module
npm run gen:component # new shared component
npm run gen:store    # new Pinia store
npm run gen:api      # new API file
```

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before writing any code.

## Design

Figma designs are shared privately with team members. Ask Arjeeah for access.
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README with project-specific quick start"
```

---

### Task 6: Update CONTRIBUTING.md

**Files:**
- Modify: `CONTRIBUTING.md`

**Step 1: Replace the entire content of `CONTRIBUTING.md`**

```markdown
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

| What | Command |
|---|---|
| New feature module | `npm run gen:module` |
| New page in a module | `npm run gen:page` |
| New Pinia store | `npm run gen:store` |
| New shared component | `npm run gen:component` |
| New API file | `npm run gen:api` |

## Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Vue component files | PascalCase | `UserTable.vue` |
| Page components | `<Name>Page.vue` suffix | `UserListPage.vue` |
| Shared UI components | `App` prefix | `AppDialog.vue` |
| Composables | `use` prefix | `usePagination.ts` |
| Pinia stores | `use` + `Store` suffix | `useUsersStore.ts` |
| API files | camelCase + `Api` suffix | `usersApi.ts` |
| Everything else | kebab-case | `mock-users.ts` |

## Vue rules

- **Always** `<script setup lang="ts">` — never Options API
- **No `<style>` blocks** — use Tailwind classes only
- **No `any`** — define a proper type or use `unknown`
- **Design tokens only** — use `text-text-primary`, `bg-primary`, etc. from `tailwind.config.ts`. Never raw hex like `text-[#ABC123]`
- Check `src/shared/components/` before building a new component — it may already exist

## What ESLint will block

- A module importing from another module (e.g. `auth/` importing from `users/`). Fix: move the shared code to `src/shared/`.
- Shared code importing from a module. Fix: the shared code must not depend on a specific feature.

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

2. **Pre-push** (slower, ~10 seconds): runs the full TypeScript type-check before your code reaches GitHub. This catches type errors that ESLint misses.

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
```

**Step 2: Commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs: update CONTRIBUTING with Vue rules, git workflow, and hook explanation"
```

---

## Verification checklist (run after all tasks)

```bash
# 1. Hooks are installed
ls .husky/pre-commit .husky/pre-push

# 2. lint-staged config exists in package.json
grep -A 8 '"lint-staged"' package.json

# 3. CI workflow exists
cat .github/workflows/ci.yml

# 4. CLAUDE.md exists
head -5 CLAUDE.md

# 5. Make a test commit to confirm hooks fire
echo "" >> src/composables/usePagination.ts
git add src/composables/usePagination.ts
git commit -m "chore: verify hooks"
git revert HEAD --no-edit
```
