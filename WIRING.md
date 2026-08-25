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
