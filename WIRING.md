# WIRING.md — stream S1 (module `search`)

Everything the phase-3 integrator must add **outside** `src/modules/search/`.
Nothing in this stream edits the router, `AppSidebar`, or `src/locales/*.json`.

## Routes

Add as a child of the `/` layout route in `src/app/router/index.ts`.
Position it **immediately after `dashboard`** — it is the first item after the
dashboard in the nav, and the router order should match.

| path     | lazy component import                   | meta.roles     |
| -------- | --------------------------------------- | -------------- |
| `search` | `@/modules/search/pages/SearchPage.vue` | _omit the key_ |

```ts
{
  path: 'search',
  component: () => import('@/modules/search/pages/SearchPage.vue'),
},
```

`meta.roles` is deliberately **absent**, not `[]`. Search is open to every
authenticated role — `PipelinePolicy::search()` in the backend returns `true`
unconditionally, so `super_admin`, `archivist` and `faculty_staff` all get it.
Per CLAUDE.md an empty array is an empty allowlist and would hide it from
everyone.

## Sidebar

One top-level entry in `AppSidebar`'s `navItems`, **inserted directly after the
`dashboard` item and before `users`**.

| field    | value                                       |
| -------- | ------------------------------------------- |
| key      | `search`                                    |
| labelKey | `nav.search`                                |
| icon     | `Search` (lucide-vue-next)                  |
| to       | `/search`                                   |
| roles    | _omit the key_ (visible to all three roles) |

```ts
{ key: 'search', labelKey: 'nav.search', icon: Search, to: '/search' },
```

`Search` must be added to the existing `lucide-vue-next` import in `AppSidebar.vue`.

## i18n

`src/modules/search/i18n.fragment.json` is shaped `{ en: {...}, ar: {...} }` and
merges **key-for-key** into `src/locales/en.json` / `ar.json`. It carries two
top-level namespaces:

- `search.*` — everything on the page (52 keys per locale)
- `nav.search` — the sidebar label above (1 key per locale)

`nav.search` sits outside the module namespace on purpose: the sidebar entry is
the integrator's to add and it needs a label key that follows the existing
`nav.*` convention. It is the only key this stream contributes outside `search.*`,
and it does not collide with any existing key in either locale file.

Totals: **53 keys per locale, 106 across en + ar.** The `en` and `ar` key sets
are identical, and neither collides with an existing key in the locale files.

A **deep** merge is required — `nav` already exists in both files and must not be
replaced wholesale.

## Notes

1. **Result links point at stream S4's routes.** A hit links to
   `/students/:id` when the row resolved to a student, and to
   `/student-documents/:id` when it did not (`student_id` is null for documents
   the pipeline has not linked yet). Both paths are centralised in
   `src/modules/search/utils/resultLinks.ts` — if S4 lands on different route
   names, that one file is the only edit needed. Until S4 lands, these links
   resolve to the app's 404 child route, which keeps the shell (no crash, no
   router warning).

2. **No endpoint was added to `src/app/config/api.ts`.** `POST /v1/search` is
   declared as a const inside `api/searchApi.ts`, because `src/app/config/` is
   outside this stream's territory. Lift it into `API_ENDPOINTS` if you want it
   centralised; the module already reads `API_ENDPOINTS.faculties.list` and
   `API_ENDPOINTS.programs.list` from there for the filter lookups.

3. **The academic lookups walk pages.** `FacultyController` and
   `ProgramController` both hard-code `->paginate(10)` and therefore ignore
   `per_page`, so `searchApi` fetches page-by-page (capped at 20 pages) to fill
   the faculty/program selects. If those controllers ever start honouring
   `per_page`, `fetchAllPages` in `api/searchApi.ts` can collapse to one request.

4. **Nothing else.** No shared component, store, plugin or config file was
   changed or needs changing.
