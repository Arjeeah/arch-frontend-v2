# Contributing

Welcome to the team! Here's everything you need to contribute.

## The one rule

If a piece of code is used by **one feature**, put it in `src/modules/<that-feature>/`.
If it's used by **two or more features**, put it in `src/shared/`.

That's it. If you're unsure, ask Arjeeah.

## Folder structure

```
src/
├── modules/           # one folder per feature
│   └── <feature>/
│       ├── pages/     # route-level views
│       ├── components/# components used only by this feature
│       ├── stores/    # pinia state for this feature
│       ├── api/       # http calls for this feature
│       └── types.ts   # types for this feature
├── shared/
│   ├── components/    # UI used by 2+ features (Button, Modal, Table…)
│   ├── composables/   # hooks used by 2+ features
│   └── utils/         # pure helpers used by 2+ features
├── locales/           # i18n translation files (en.json, ar.json…)
└── app/
    ├── router/        # route definitions
    ├── layouts/       # page layout components (sidebar, header shells)
    ├── plugins/       # axios, i18n setup
    └── config/        # env variables
```

## Adding things — always use the generators

Don't create files by hand. The generators create the right structure automatically.

| What | Command |
|---|---|
| New feature module | `npm run gen:module` |
| New page in a module | `npm run gen:page` |
| New Pinia store in a module | `npm run gen:store` |
| New shared component | `npm run gen:component` |
| New API file in a module | `npm run gen:api` |

## Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Files | kebab-case | `user-list.ts`, `faculty-form.vue` |
| Vue components | PascalCase | `UserList.vue` |
| Composables | `use` prefix | `useDebounce.ts` |
| Pinia stores | `use` + `Store` suffix | `useUsersStore.ts` |

## What ESLint will block

- A file in `src/modules/auth/` importing from `src/modules/users/`. Modules must not depend on each other. If you need to share something between two modules, move it to `src/shared/`.
- A file in `src/shared/` importing from any `src/modules/`. Shared code must not depend on a specific feature.

If lint blocks you, the error message tells you exactly what went wrong. If you're stuck, ask — those conversations are the whole point of the club.

## Submitting a PR

1. Create a branch from `main`: `git checkout -b feat/your-feature-name`
2. One feature per PR. Smaller is better.
3. Make sure `npm run lint` and `npm run build` both pass.
4. Open a PR and wait for review before merging.

## Running the project

```bash
npm install       # install deps
npm run dev       # start dev server at localhost:5173
npm run build     # production build
npm run lint      # lint check
```
