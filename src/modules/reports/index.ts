// Reports module entrypoint.
//
// The router lazy-imports `pages/ReportsPage.vue` directly; nothing else in the
// app consumes this module, so there is no public surface to re-export.
// Cross-module imports are forbidden — see the boundaries rule in CLAUDE.md.
export {}
