# WIRING — S9 (modules `reports`, `imports`)

Everything below lives outside this stream's territory and is for the phase-3
integrator to apply.

## Routes

Add as children of the `/` layout route in `src/app/router/index.ts`, before the
404 catch-all.

| path      | component (lazy import)                   | meta.roles                                      |
| --------- | ----------------------------------------- | ----------------------------------------------- |
| `reports` | `@/modules/reports/pages/ReportsPage.vue` | `['super_admin', 'archivist', 'faculty_staff']` |
| `imports` | `@/modules/imports/pages/ImportsPage.vue` | `['super_admin', 'archivist']`                  |

```ts
{
  path: 'reports',
  component: () => import('@/modules/reports/pages/ReportsPage.vue'),
  meta: { roles: ['super_admin', 'archivist', 'faculty_staff'] },
},
{
  path: 'imports',
  component: () => import('@/modules/imports/pages/ImportsPage.vue'),
  meta: { roles: ['super_admin', 'archivist'] },
},
```

**Why `/reports` includes `faculty_staff`** — the brief said archivist +
super_admin, and told this stream to check the backend policies for exactness.
`ReportPolicy` (`app/Policies/ReportPolicy.php`) explicitly grants faculty_staff
`audit_logs`, `borrowings`, `student_documents` and `faculty_report`.
`GET /v1/reports/types` is already filtered per role server-side, so a
faculty_staff user only ever sees the types they may generate. The weekly-digest
widget on the page is hidden for that role, because
`ReportController::weeklyDigest` answers 403 for it. Drop `faculty_staff` from
both the route and the sidebar entry if the product decision is the narrower
one — nothing else changes.

`/imports` is archivist + super_admin because both import controllers
`abort(403)` for `faculty_staff` (`ImportController::store`,
`ImportTemplateController::download`).

Neither route changes `ROLE_LANDING`; `faculty_staff` still lands on
`/borrowing`.

## Sidebar

Add to `navItems` in `src/shared/components/AppSidebar.vue`, both top-level,
after `audit`.

| key       | labelKey      | lucide icon       | roles                                           | position                   |
| --------- | ------------- | ----------------- | ----------------------------------------------- | -------------------------- |
| `reports` | `nav.reports` | `FileBarChart2`   | `['super_admin', 'archivist', 'faculty_staff']` | top-level, after `audit`   |
| `imports` | `nav.imports` | `FileSpreadsheet` | `['super_admin', 'archivist']`                  | top-level, after `reports` |

```ts
{
  key: 'reports',
  labelKey: 'nav.reports',
  icon: FileBarChart2,
  to: '/reports',
  roles: ['super_admin', 'archivist', 'faculty_staff'],
},
{
  key: 'imports',
  labelKey: 'nav.imports',
  icon: FileSpreadsheet,
  to: '/imports',
  roles: ['super_admin', 'archivist'],
},
```

Both icons exist in the installed `lucide-vue-next` (verified against
`node_modules`). The sidebar's own comment lists `reports` as "waiting on its
module" — that note can go once this lands.

## i18n fragments

- `src/modules/reports/i18n.fragment.json` — 92 leaf keys per locale under
  `reports.*`.
- `src/modules/imports/i18n.fragment.json` — 63 leaf keys per locale under
  `imports.*`, **plus one key outside the module namespace**:
  `nav.imports` (`"Excel imports"` / `"الاستيراد من Excel"`). The sidebar needs
  a label key and `src/locales/*.json` is off-limits to this stream, so it ships
  in the fragment under `nav`. Merge it into `nav` in both locale files; if the
  merge tool only reads the module key, add those two strings by hand.
- `nav.reports` already exists in both locale files (`"Reports"` /
  `"التقارير"`) — nothing to add for it.

## Notes

1. **No API-endpoint constants were added to `src/app/config/api.ts`.** Both
   modules declare their endpoint table locally (`REPORTS_ENDPOINTS` in
   `src/modules/reports/api/reportsApi.ts`, `IMPORTS_ENDPOINTS` in
   `src/modules/imports/api/importsApi.ts`) because `src/app/` is outside this
   stream's territory. Move them into `API_ENDPOINTS` later if the project wants
   one table; nothing depends on where they live.
2. **Neither module has a server-side list endpoint**, so neither uses
   `useServerTable`. `routes/api/v1.php` exposes only
   `reports/{types,generate,weekly-digest,{id}/status,{id}/download}` and
   `imports/{templates/{type},{type},{id}/status,{id}/errors}` — there is no
   "list my jobs" route for either. Both job lists are therefore the ids this
   browser created, persisted under `localStorage['arch.reports.jobs']` /
   `['arch.imports.jobs']` and re-polled on mount. If a list endpoint is added
   later, swap the store's storage-backed list for a `useServerTable` fetcher —
   the row shape already matches.
3. **The imports error table is parsed from a CSV download.**
   `ImportStatusController::errors` streams a spreadsheet and there is no JSON
   route for `import_errors`, so `importsApi.errorRows()` asks for
   `?format=csv`, reads the blob as text and parses it
   (`src/modules/imports/utils/csv.ts`). If the backend grows a JSON endpoint,
   replace that one function — the `ImportRowError` model stays as is.
4. **Downloads go through axios, not `<a href>`.** Every file endpoint is
   Sanctum-protected, so `download_url` from `ReportJobResource` must not be
   navigated to directly — it would 401. Each module has its own `saveBlob`
   helper (duplicated across the two by the boundaries rule); promote it to
   `src/shared/utils/` if a third module needs it.
5. **No `gen:module` scaffold.** Neither module is CRUD — no list/create/edit
   dialogs, no `:id` routes — so the generated table/dialog scaffold would have
   been deleted wholesale. Files follow the same layout by hand.
6. **Storage keys introduced:** `arch.reports.jobs`, `arch.imports.jobs`. Both
   are plain job lists, no auth data, and both fail soft when storage is
   unavailable.
