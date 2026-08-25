# WIRING — S5 Dashboards (`src/modules/dashboard`)

What the phase-3 integrator has to add outside this module. The dashboard route
already exists, so this is mostly a "nothing to change" file — the one thing to
merge is the i18n fragment.

## Routes

The module keeps **one** route, unchanged from what the router already has:

| path         | component                                     | meta.roles                            |
| ------------ | --------------------------------------------- | ------------------------------------- |
| `/dashboard` | `@/modules/dashboard/pages/DashboardPage.vue` | _(omit the key — open to every role)_ |

`meta.roles` must stay **absent**. `/dashboard` is the router's `HOME_PATH`: the
guard sends every refused navigation here, so an allowlist on it would loop.

`DashboardPage.vue` is a dispatcher, not a screen — it reads the role from
`authStorage` (the same source the guard uses) and renders one of three pages in
this module:

| role            | page rendered                | endpoints it calls                                                                                  |
| --------------- | ---------------------------- | --------------------------------------------------------------------------------------------------- |
| `super_admin`   | `AdminDashboardPage.vue`     | `/v1/dashboard`, `/v1/audit-logs/stats`, `/v1/audit-logs`, `/v1/users`, `/v1/reports/weekly-digest` |
| `archivist`     | `ArchivistDashboardPage.vue` | `/v1/dashboard/archivist`, `/v1/dashboard`                                                          |
| `faculty_staff` | `FacultyDashboardPage.vue`   | `/v1/faculty-staff/dashboard`                                                                       |

No sub-routes were added on purpose: the three pages are role-exclusive
server-side (the archivist endpoint 403s a super_admin, the admin endpoint 403s
faculty staff), so a deep link to another role's dashboard could only ever show
an error.

## Sidebar

No change. The existing entry is already correct:

| label key       | icon              | roles         | position |
| --------------- | ----------------- | ------------- | -------- |
| `nav.dashboard` | `LayoutDashboard` | _(all roles)_ | first    |

## i18n

Merge `src/modules/dashboard/i18n.fragment.json` into `src/locales/en.json` and
`src/locales/ar.json` under the existing `dashboard` key. **112 keys per
locale**, en/ar in sync. `dashboard.title` is included with its current value so
the merge is idempotent.

## Notes

1. **Nothing else is required.** No router, sidebar, or shared-component edits.

2. **The three dead footer CTAs are now live-when-possible.** "System Settings",
   "View Users" and "View Full Digest" go through `DashboardLinkButton`, which
   asks the router whether the target resolves _and_ whether the signed-in role
   passes its `meta.roles`. Paths are in `src/modules/dashboard/links.ts`:
   `/settings` (S8), `/users` (exists), `/reports` (S9). A button whose route has
   not landed stays disabled with a tooltip instead of linking into the 404 page,
   and lights up by itself once the route is registered — so merge order does not
   matter. If S8/S9 register different paths, edit `links.ts` only.

3. **`ROLE_LANDING.faculty_staff` is still `/borrowing`** (unchanged, per the
   foundations decision). A faculty dashboard now exists at `/dashboard`, so the
   integrator _may_ repoint that entry — it is a product call, not a dependency.
   Do not change it just because this module landed.

4. **Shared-kit follow-up (not mine to fix):** `DataTable` renders header cells
   with physical `text-left` / `text-right`, so a column's header does not follow
   `dir` in RTL while the body cells (which use `text-start` / `text-end`) do.
   This affects every existing table in the app, not only the dashboard; the
   one-line fix belongs in `src/shared/components/DataTable.vue`.

5. **The session's role shape needs checking app-wide (auth module, not mine).**
   `AuthUser.role` is a scalar everywhere in the frontend, but the backend's
   login response is a `UserResource`: it carries `roles: []` from Spatie's
   `getRoleNames()` — with the token as a _sibling_ of `data`, not inside it —
   and there is no `/v1/me` route for `authService.me()` to call. Those roles are
   also hierarchical (`User::assignRoleWithHierarchy`): a super_admin holds all
   three names, an archivist holds two, so an array must be reduced by
   precedence, never by first element. `utils/role.ts` in this module reads
   either shape defensively so the dispatcher cannot silently hand a super_admin
   the faculty dashboard, but the underlying login mapping is worth a look —
   every `meta.roles` gate and the sidebar depend on it.

6. **Two server-side bugs are rendered, not hidden** — both are marked in
   `api/dashboardApi.ts` at the call site:
   - `GET /v1/dashboard/archivist` → `ocr_queue` is always `{0,0,0}` because the
     service guards on a `student_documents.ocr_status` column that does not
     exist. The card labels an all-zero payload "not reported yet" rather than
     claiming a quiet day.
   - `GET /v1/faculty-staff/dashboard` → 500s when a pending borrowing exists
     (`getRecentBorrowings()` calls `->format()` on a nullable `due_date`). The
     page turns that specific 500 into a named error with a retry.
