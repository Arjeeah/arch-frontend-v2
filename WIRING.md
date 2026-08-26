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
- Not blocking, and **not fixable from inside this stream's territory**: two
  shared components still print hardcoded English inside these pages —
  `AppConfirmDialog`'s "Cancel" button and `DataTable`'s "Loading…" / "No data"
  rows. They show up untranslated on every list in the app, not just these two;
  whoever owns `src/shared/` should route them through `t()` (the delete
  confirm dialog on both pages is the most visible case in an Arabic UI).
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
