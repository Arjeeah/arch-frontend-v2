# WIRING — S7 (document-types, programs)

For the phase-3 integrator. Everything below is outside this stream's territory
(`src/app/router/`, `src/shared/components/AppSidebar.vue`, `src/locales/*.json`)
so none of it is wired yet — the two modules are complete and gate-clean on
their own, but unreachable until the routes, the sidebar entries and the locale
merges below all land.

## Routes

Add both as children of the `/` `DashboardLayout` route in
`src/app/router/index.ts`, alongside `faculties`/`audit` (same shape, same
role pair):

```ts
{
  path: 'document-types',
  component: () => import('@/modules/document-types/pages/DocumentTypeListPage.vue'),
  meta: { roles: ['super_admin', 'archivist'] },
},
{
  path: 'programs',
  component: () => import('@/modules/programs/pages/ProgramListPage.vue'),
  meta: { roles: ['super_admin', 'archivist'] },
},
```

## Sidebar

`src/shared/components/AppSidebar.vue` already has a **commented-out**
`programs` child under the `faculty-management` group — uncomment it and add
matching roles:

```ts
{
  key: 'faculty-management',
  labelKey: 'nav.facultyManagement',
  icon: GraduationCap,
  roles: ['super_admin', 'archivist'],
  children: [
    { labelKey: 'nav.faculties', to: '/faculties', roles: ['super_admin', 'archivist'] },
    { labelKey: 'nav.programs', to: '/programs', roles: ['super_admin', 'archivist'] }, // uncomment
  ],
},
```

Document types has no existing group to join — add a new top-level item.
Suggested position: after `faculty-management`, before `audit` (keeps the
"academic structure" items together ahead of the audit log):

```ts
import { FileStack } from 'lucide-vue-next' // add to the existing lucide-vue-next import

{
  key: 'document-types',
  labelKey: 'nav.documentTypes',
  icon: FileStack,
  to: '/document-types',
  roles: ['super_admin', 'archivist'],
},
```

## Locales

`src/locales/en.json` / `ar.json` — off limits for this stream, but the
sidebar keys above don't exist yet and aren't part of either module's
`i18n.fragment.json` (those only carry the `documentTypes.*` / `programs.*`
page content, not shell-chrome `nav.*` keys). Add these two pairs to the
existing `"nav"` block in both files when wiring the sidebar:

| key                 | en             | ar               |
| ------------------- | -------------- | ---------------- |
| `nav.programs`      | Programs       | البرامج الدراسية |
| `nav.documentTypes` | Document Types | أنواع الوثائق    |

## i18n fragments

Merge these two into `src/locales/en.json` / `ar.json` alongside the `nav.*`
pairs above — they carry every user-visible string on both pages:

| fragment                                        | namespace       |
| ----------------------------------------------- | --------------- |
| `src/modules/document-types/i18n.fragment.json` | `documentTypes` |
| `src/modules/programs/i18n.fragment.json`       | `programs`      |

Each file is shaped `{ "en": { "<ns>": {…} }, "ar": { "<ns>": {…} } }`; the two
locale halves have identical key sets, so a straight deep-merge per locale is
enough.

## Notes

- Both modules are otherwise self-contained: no other module imports from
  them, and they import nothing from other modules (own-territory
  `facultyLookupApi` in `src/modules/programs/api/programsApi.ts` calls
  `/v1/academic/faculties` directly rather than importing the `faculties`
  module).
- `document-types` has no entry in the shared `src/app/config/api.ts` map
  (out of territory to add one) — its api file hardcodes the base path
  `/v1/document-types` instead, same pattern as the existing `audit` module.
  `programs` reuses the `API_ENDPOINTS.programs` entries that already exist
  there, except `restore`, which isn't in that map either and is hardcoded
  the same way.
- Not blocking, and **not fixable from inside this stream's territory** —
  three `src/shared/` gaps that show on every list in the app, not just these
  two pages. Whoever owns `src/shared/` should pick them up:
  - `AppConfirmDialog`'s "Cancel" button is hardcoded English. Most visible
    case in an Arabic UI, since it sits next to a translated confirm label on
    both delete dialogs here.
  - `DataTable`'s "Loading…" row is hardcoded English (its "No data" row never
    shows on these two pages — both switch to `AppEmptyState` before the table
    renders).
  - `DataTable` puts `text-left` on every column header that isn't explicitly
    `align: 'center'`/`'right'`, and its column type has no `'start'` option.
    Under `dir="rtl"` the header sits left while the cell text under it sits
    right. Making the default `text-start` fixes it app-wide.
- `programsApi.restore` (`POST /v1/academic/programs/{id}/restore`) is
  implemented but **deliberately not surfaced in the UI**: `ProgramController`
  soft-deletes, but its `index` has no `AllowedFilter::trashed()` and no
  `withTrashed` path, so there is no endpoint that can list a deleted program
  to restore it. If the backend adds a trashed filter, the api call is already
  there and only a "trashed" view is missing.
- `ProgramListPage`'s faculty **filter** dropdown loads once on mount and only
  reports a failure through a toast — a failed lookup leaves that one select
  empty until the page is revisited. The list itself and the create/edit
  dialog's faculty select (which retries on every open) are unaffected, so
  this is cosmetic rather than blocking.
- Backend was offline for this stream; every wire-shape assumption was verified
  by reading `arch-backend` controllers/requests/resources directly rather than
  guessing, **except** one spot flagged `verify against live API` in
  `src/modules/programs/api/programsApi.ts`: whether `store`/`update` on
  `ProgramResource` return the `faculty` relation (the controller doesn't
  eager-load it on those two actions, so the key may be entirely absent rather
  than `null` — `fromResource` treats both the same way already, so this is a
  confirm-not-a-blocker).
- Both list endpoints are Spatie QueryBuilder, so filters go on the wire as
  `?filter[name]=…`, never `?name=…`. The nesting is done inside each module's
  `api/*.ts` (`toQuery`); if a later stream adds filters to these pages, add
  them to `*ListParams` and let `toQuery` nest them rather than passing a
  pre-built `filter` object through `useServerTable.setFilters` (which merges
  per key and would clobber the group).
- Spatie ANDs allowed filters, so the programs search box cannot match
  `name_ar` OR `name_en` in one request. `ProgramListPage` routes the query by
  script instead — Arabic characters go to `name_ar`, anything else to
  `name_en`, and the unused half is cleared each keystroke. A program's `code`
  is not an allowed filter at all, so it stays unsearchable until the backend
  adds one.
- `ProgramResource` exposes no `faculty_id` column — the id is only reachable
  through the nested `faculty` relation, which `index` eager-loads but
  `store`/`update`/`show` do not. `Program.facultyId` is therefore typed
  `number | null` on the UI model. If the backend ever adds `faculty_id` to the
  resource, read it directly in `fromResource` and the `null` case disappears.
