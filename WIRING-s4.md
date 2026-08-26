# WIRING — S4 (students, student-documents)

Everything the integrator adds outside `src/modules/students/` and
`src/modules/student-documents/`. Nothing else in this stream touches the shell.

## Routes

Add as children of the `/` layout route in `src/app/router/index.ts`, before the
`:pathMatch(.*)*` catch-all.

| path                       | lazy component import                                             | meta.roles                     |
| -------------------------- | ----------------------------------------------------------------- | ------------------------------ |
| `students`                 | `@/modules/students/pages/StudentListPage.vue`                    | _(omit the key — all roles)_   |
| `students/:id`             | `@/modules/students/pages/StudentDetailPage.vue`                  | `['super_admin', 'archivist']` |
| `student-documents`        | `@/modules/student-documents/pages/StudentDocumentListPage.vue`   | `['super_admin', 'archivist']` |
| `student-documents/upload` | `@/modules/student-documents/pages/StudentDocumentUploadPage.vue` | `['super_admin', 'archivist']` |
| `student-documents/:id`    | `@/modules/student-documents/pages/StudentDocumentDetailPage.vue` | `['super_admin', 'archivist']` |

```ts
{ path: 'students', component: () => import('@/modules/students/pages/StudentListPage.vue') },
{
  path: 'students/:id',
  component: () => import('@/modules/students/pages/StudentDetailPage.vue'),
  meta: { roles: ['super_admin', 'archivist'] },
},
{
  path: 'student-documents',
  component: () => import('@/modules/student-documents/pages/StudentDocumentListPage.vue'),
  meta: { roles: ['super_admin', 'archivist'] },
},
{
  path: 'student-documents/upload',
  component: () => import('@/modules/student-documents/pages/StudentDocumentUploadPage.vue'),
  meta: { roles: ['super_admin', 'archivist'] },
},
{
  path: 'student-documents/:id',
  component: () => import('@/modules/student-documents/pages/StudentDocumentDetailPage.vue'),
  meta: { roles: ['super_admin', 'archivist'] },
},
```

`students` deliberately carries **no** `roles` key: `faculty_staff` may read the
register. The page hides every mutating control and renders names as plain text
for that role, which is why `students/:id` is restricted and the list never
links into it for them.

`students/:id` **must keep** its `roles` key. The detail page reads
`GET /v1/pipeline/status/{id}` for each of the student's documents, and
`PipelinePolicy::viewStatus` allows only `archivist` and `super_admin` — opening
the route to `faculty_staff` would give them a page that 403s per document.
`/v1/students` and `/v1/student-documents` themselves have no policy, so every
role gate in this stream is enforced by the router, not the API.

Register `student-documents/upload` before `student-documents/:id`. Vue Router 4
ranks a static segment above a param, so either order resolves correctly — the
convention just keeps the intent readable.

## Sidebar

Two top-level entries in `navItems` in `src/shared/components/AppSidebar.vue`.
Icons come from `lucide-vue-next` and must be added to that file's existing
import block.

| labelKey               | icon         | roles                          | parent / position                                                             |
| ---------------------- | ------------ | ------------------------------ | ----------------------------------------------------------------------------- |
| `nav.students`         | `UsersRound` | _(omit the key — all roles)_   | top-level, directly after `dashboard` (after S1's `search` item if it landed) |
| `nav.studentDocuments` | `FileStack`  | `['super_admin', 'archivist']` | top-level, directly after `students`                                          |

```ts
{ key: 'students', labelKey: 'nav.students', icon: UsersRound, to: '/students' },
{
  key: 'student-documents',
  labelKey: 'nav.studentDocuments',
  icon: FileStack,
  to: '/student-documents',
  roles: ['super_admin', 'archivist'],
},
```

Each entry's `roles` matches its route's `meta.roles` exactly, as the sidebar
contract requires.

## Notes

- **i18n fragments to merge:** `src/modules/students/i18n.fragment.json` and
  `src/modules/student-documents/i18n.fragment.json`. Each has an `en` and an
  `ar` object holding a `nav` block plus the module's own namespace
  (`students.*` / `studentDocuments.*`). The `nav` blocks contribute
  `nav.students` and `nav.studentDocuments` — the two sidebar labels above.
- **No `ROLE_LANDING` change.** `faculty_staff` still lands on `/borrowing`;
  `/students` is a place it may visit, not its home.
- **Cross-screen links these modules emit** (routes, not imports — they break if
  the paths above change):
  - student detail → `/student-documents/upload?student=<student-uuid>`; the
    upload form pre-fills the student from that query param.
  - student detail → `/student-documents/<document-uuid>`.
  - document list and document detail → `/students/<student-uuid>`.
- **Endpoints outside this module's own resource** are called over HTTP from
  `students/api/studentLookupsApi.ts` and
  `student-documents/api/documentLookupsApi.ts` rather than by importing another
  module — `/v1/academic/faculties`, `/v1/academic/programs`,
  `/v1/location/drawers`, `/v1/document-types`, `/v1/uploads`,
  `/v1/pipeline/status/{id}` and `/v1/ai-console/documents/{id}/segments`. If a
  later stream centralises any of those, these files are the ones to revisit.
- **`src/app/config/api.ts` is untouched.** Both modules declare their own URL
  constants at the top of their api files, matching the "module owns its wire
  surface" convention. Nothing needs adding to `API_ENDPOINTS`.

## Accepted debt

Known, deliberate, and each one has a reason. None blocks integration.

- **`PipelineStatusChip.vue` exists twice**, once per module. `boundaries`
  forbids importing across `src/modules/`, and `src/shared/` is not this
  stream's territory. If a later pass moves it to `src/shared/`, delete both
  copies; the status set and the tone map are identical.
- **Three shared components render hardcoded English** that shows through on
  these screens: `AppConfirmDialog`'s "Cancel", `DataTable`'s "Loading…" /
  "No data", and `AppFileUpload`'s file-rejection reasons. All in
  `src/shared/`, so untouched here. Both upload surfaces already restate the
  rejection in the reader's language (`studentDocuments.errors.fileRejected`),
  but `AppFileUpload` still lists its own English reason underneath.
- **Escape inside `AppAsyncSelect` closes the whole dialog.** The typeahead
  calls `preventDefault()` but not `stopPropagation()`, and `AppDialog` listens
  for Escape on `document`, so dismissing the drawer/student dropdown also
  discards the form. Both components are shared.
- **No pipeline retry button on the document detail page**, although
  `POST /v1/pipeline/{studentDocument}/retry` exists and a `failed` document has
  no other recovery path than re-uploading the scan. Left out deliberately: S2
  owns pipeline actions, and duplicating the control here would fork the
  behaviour. Worth adding once S2 has landed.
- **No pipeline-status filter on the document list.** `allowedFilters` on
  `StudentDocumentController@index` covers `file_number`, `student_id`,
  `document_type_id` and `file_status` only, so "everything that failed OCR" is
  not expressible from this screen — it needs a backend change, and the pipeline
  monitor owns that view meanwhile.
- **Faculty and program option lists page-walk.** `FacultyController` and
  `ProgramController` both hardcode `paginate(10)` with no `per_page` override,
  so filling a dropdown costs one request per ten rows (capped at 20 pages).
  A `per_page` on either controller removes the loop.
- **Promoting a DRAFT student only flips `student_status`.** Draft rows
  legitimately carry null faculty/program/nationality/enrollment_year, and
  `UpdateStudentRequest` is all-`sometimes`, so the promotion succeeds while
  leaving them null. The edit dialog requires those fields, so the intended
  flow is edit-then-promote — but nothing enforces the order. Product decision.
- **`gen:module` was not used.** Neither module fits the generator's single flat
  resource shape (cascading lookups, two-step upload, cross-endpoint pipeline
  reads, a detail page it does not emit). Written to the `usersApi` /
  `facultiesApi` reference pattern instead, with the same file layout.
- **`notes` uses a single-line `FormInput`.** There is no shared textarea, and
  adding one means touching `src/shared/`.
- **The scan preview is behind a toggle.** Media is served from the API host,
  which may refuse framing; the header link is always the reliable way in.
