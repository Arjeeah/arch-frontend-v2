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
