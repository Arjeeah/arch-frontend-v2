# Contribution Guide & Enforcement Design

**Goal:** Set up a complete onboarding guide, coding rules, and automated enforcement so all club members produce consistent, quality code from day one.

**Approach:** Husky + lint-staged for local git hooks, GitHub Actions for CI, CLAUDE.md for Claude Code guidance, updated README and CONTRIBUTING docs.

---

## Git Hooks (Husky + lint-staged)

**Pre-commit** — runs only on staged files (fast):
1. `oxlint --fix` + `eslint --fix` on staged `.vue` and `.ts` files — auto-fixes what it can, blocks on remaining errors
2. `prettier --write` on staged files — formatting always auto-fixed silently
3. Fixed files are re-staged automatically

**Pre-push** — runs on all files:
1. `vue-tsc --build` — full type-check; here because it's slow and touches non-staged files

Beginners experience: commit → silent auto-fix of formatting/simple lint → clear error message with file + line if a real problem exists.

---

## GitHub Actions CI

File: `.github/workflows/ci.yml`

Triggers: pull_request to main, push to main.

Steps (in order):
1. Checkout
2. Setup Node 22 with npm cache
3. `npm ci`
4. `npm run lint` (no --fix — CI never silently mutates code)
5. `npm run type-check`
6. `npm run build`

Branch protection rules (set manually in GitHub repo settings):
- Require PR before merging to main
- Require 1 approving review
- Require status checks: lint, type-check, build

---

## CLAUDE.md

File: `CLAUDE.md` at repo root. Loaded automatically by Claude Code.

Sections:
- Project snapshot (ARCH system, stack, API base URL)
- Always use generators (`npm run gen:*`) before creating files
- Module boundary rule — modules never import from each other
- Vue conventions — `<script setup lang="ts">`, no `<style>` blocks, Tailwind only
- Design tokens — always use Tailwind tokens, never raw hex in templates
- Before finishing any task — `npm run lint` + `npm run type-check` must pass
- Never-do list — no `any`, no cross-module imports, no raw hex, no hand-created files that generators cover

---

## README.md

Replace generic Vite template with:
- What the project is
- Prerequisites (Node 22+, VS Code + Volar)
- Quick start
- Links to CONTRIBUTING.md and Figma
- Note: git hooks install automatically on `npm install`

---

## CONTRIBUTING.md additions

Keep existing content, add:
- Vue-specific rules: `<script setup lang="ts">` only, no `<style>` blocks, Tailwind tokens only
- Shared component convention: `App` prefix for shared UI components
- Git workflow: branch naming (`feat/`, `fix/`, `chore/`), commit message format
- What the git hooks do (so beginners aren't surprised by auto-edits)
- Branch protection: PRs need 1 review + green CI before merge
