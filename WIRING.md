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
both the route and the sidebar entry if the product decision is the narrower one
— nothing else changes.

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

- `src/modules/reports/i18n.fragment.json` — 95 leaf keys per locale under
  `reports.*`.
- `src/modules/imports/i18n.fragment.json` — 64 leaf keys per locale under
  `imports.*`, **plus one key outside the module namespace**: `nav.imports`
  (`"Excel imports"` / `"الاستيراد من Excel"`). The sidebar needs a label key
  and `src/locales/*.json` is off-limits to this stream, so it ships in the
  fragment under `nav`. Merge it into `nav` in both locale files; if the merge
  tool only reads the module key, add those two strings by hand.
- `nav.reports` already exists in both locale files (`"Reports"` / `"التقارير"`)
  — nothing to add for it.

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
   browser created, persisted under the per-user localStorage keys in note 6 and
   re-polled on mount. If a list endpoint is added later, swap the store's
   storage-backed list for a `useServerTable` fetcher — the row shape already
   matches.
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
6. **Storage keys introduced:** `arch.reports.jobs.u<userId>` and
   `arch.imports.jobs.u<userId>` (`.anon` when nobody is signed in). They hold
   plain job lists, never auth data, and fail soft in both directions when
   storage is blocked or full.

   The per-user suffix is load-bearing, not cosmetic. Archive workstations are
   shared: `ReportPolicy::viewJob` only lets the original requester (or a Super
   Admin) read a report job, and `ImportStatusController::status` has no
   ownership check at all — so a browser-global key showed the next person to
   sign in the previous user's queue, then polled rows that answer 403 forever.
   The pages call `store.hydrate()` in `onMounted` because signing in and out
   are router navigations that the Pinia store outlives.

7. **File calls override the shared axios timeout.** `src/app/plugins/axios.ts`
   creates `http` with `timeout: 15_000`, which is right for JSON and wrong for
   a 10 MB workbook (`ImportController::store` allows `max:10240` KB). Uploads
   use 300 s and every file download 120 s, set per request in the module api
   files. If a global file-transfer timeout is ever added to `src/app/`, these
   overrides can go.

8. **Backend bug found while wiring the report filters — `document_type_id`.**
   `ReportType::filterSchema()` advertises it as `integer`, and
   `StudentDocumentsExport::query()` casts it with `(int)` before the `where`.
   But `document_types.id` is a `uuid` (`create_document_types_table`) and
   `GenerateReportRequest` validates the filter as a plain `string`. The cast
   turns every UUID into `0`, so the filter can never match. The frontend now
   renders the field as a UUID text box (`FIELD_TYPE_OVERRIDES` in
   `ReportFilterField.vue`) instead of a number input that could not hold a
   valid value at all — but the server-side cast still needs fixing before the
   filter narrows anything. Please route this to the backend owner; nothing on
   this side changes when it lands.

9. **Enum values for `filter_schema` live in the frontend.** `/v1/reports/types`
   sends the PHP enum's _class name_ (`"BorrowingStatus"`, `"UserRole"`), not
   its cases, so `ReportFilterField.vue` carries the case lists mirrored from
   `app/Enums/`. Adding a case to `BorrowingStatus`, `UserRole`, `FileStatus` or
   `UserStatus` needs the matching line there. The alternative — a
   `filter_schema` that ships real option arrays — would delete that table.

## Accepted debt

- **Neither job list has a loading or an error state.** The shared rule asks for
  loading + `AppErrorState` + `AppEmptyState` on every list; these two lists are
  not server-fetched (see note 2), they are read synchronously out of
  localStorage, so there is no request to be loading or to have failed. Both
  have the empty state. The _errors_ list inside `ImportErrorsTable` is a real
  fetch and does carry all three. If a "list my jobs" endpoint lands, add the
  two states along with `useServerTable`.
- **Background polling swallows its failures.** A tick that 403s or 5xxs leaves
  the row alone and retries in 5 s, on purpose — a toast every 5 s while the
  network is flapping is worse than silence. The _manual_ refresh button passes
  `{ throwOnError: true }` and does toast, so an explicit action is never
  silent.
- **A job with a status this build does not recognise is treated as `pending`**
  and therefore polls indefinitely while the page is open. Deliberate: freezing
  a row the server may still be working on is the worse failure. Both mappers
  carry a `// verify against live API` marker.
- **`saveBlob` is duplicated** in `src/modules/reports/utils/` and
  `src/modules/imports/utils/`. The boundaries rule forbids one module importing
  another's helper and `src/shared/` is outside this stream. Promote it on the
  next module that needs it.
- **Rejection messages from `AppFileUpload` are English literals** emitted by
  the shared component (`"… is larger than 10 MB"`), and `AppConfirmDialog`'s
  Cancel button is a hardcoded "Cancel". Both live in `src/shared/`, outside
  this stream's territory; the page toasts whatever the component emits.
- **`npm run build` does not exercise these two modules.** Nothing imports them
  until the routes in the table above are added, so Vite tree-shakes them out
  and no `ReportsPage`/`ImportsPage` chunk is emitted. `npm run type-check`
  (`vue-tsc`) _does_ cover them, templates included — verified by planting a
  deliberate template type error and watching it fail. Re-run the build after
  wiring the routes.
