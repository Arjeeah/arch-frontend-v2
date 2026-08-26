# WIRING — S5 Dashboards (`src/modules/dashboard`)

What the phase-3 integrator has to do outside this module.

No route or sidebar entry is added — `/dashboard` already exists and stays as it
is. Three things are needed: merge the i18n fragment, and the two **required**
items under Notes (a one-line `ROLE_LANDING` change, and the login response
mapping in the auth module, which every role gate in the app depends on).

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
`src/locales/ar.json` under the existing `dashboard` key. **114 keys per
locale**, en/ar in sync. `dashboard.title` is included with its current value so
the merge is idempotent.

`dashboard.warnings.*` is keyed by the server's warning `type` slug
(`storage_capacity` today). The card falls back to the server's own English
`message` for a type the fragment does not cover, so a new server-side warning
degrades to English rather than disappearing — add the key here when one lands.

## Notes

### Required before this stream is useful

1. **Repoint `ROLE_LANDING.faculty_staff` to `/dashboard`** (`src/app/router/index.ts`).
   It is still `/borrowing`, which predates this module. S5's contract is a
   role-routed landing for all three roles, and faculty staff now have a
   dashboard — as it stands they never reach it unless they click the sidebar.
   One-line change:

   ```diff
   -  faculty_staff: '/borrowing',
   +  faculty_staff: '/dashboard',
   ```

2. **Fix the login response mapping (auth module).** This one is blocking, not
   cosmetic — nothing role-aware in the app works until it lands, the dashboard
   dispatcher included. `POST /v1/login` answers with a `UserResource` wrapped
   by Laravel plus siblings:

   ```jsonc
   {
     "data": { "id": 1, "name": "…", "roles": ["super_admin", "archivist", "faculty_staff"] },
     "token": "…",
     "message": "…",
   }
   ```

   `AuthService.login` returns that body as `LoginResponse` and
   `useAuthStore.login` destructures `{ token, user }` from it. `token` resolves;
   **`user` is `undefined`**, so `authStorage.setSession` writes the literal
   string `"undefined"` into `auth_user`, and every later `authStorage.getUser()`
   fails its `JSON.parse` and returns `null`. Consequences today:
   - the router guard sees no role, so `meta.roles` routes bounce to `/dashboard`;
   - `AppSidebar` receives `role = null` and hides every role-restricted item;
   - this module's dispatcher falls through to the **admin** dashboard for
     everyone, so an archivist gets one 403 card and faculty staff get a
     screen of them.

   The fix is in the auth module (read `data`, reduce `roles[]` by precedence to
   the scalar `AuthUser.role`). Also note `authService.me()` calls `/v1/me`,
   which **does not exist** in `routes/api/v1.php` — `authStore.init()` therefore
   always fails (harmlessly: non-401 keeps the session).

   `utils/role.ts` in this module already reads either shape and reduces an
   array by precedence, so the dispatcher will be correct the moment the login
   mapping is, with no change here.

### Informational

3. **The three dead footer CTAs are now live-when-possible.** "System Settings",
   "View Users" and "View Full Digest" go through `DashboardLinkButton`, which
   asks the router whether the target resolves _and_ whether the signed-in role
   passes its `meta.roles`. Paths are in `src/modules/dashboard/links.ts`:
   `/settings` (S8), `/users` (exists), `/reports` (S9). A button whose route has
   not landed stays disabled with a tooltip instead of linking into the 404 page,
   and lights up by itself once the route is registered — so merge order does not
   matter. If S8/S9 register different paths, edit `links.ts` only.

4. **Role counts are derived, not read.** Roles are hierarchical server-side
   (`User::assignRoleWithHierarchy`: a super_admin holds all three names), and
   `/v1/users?filter[role]=` resolves through Spatie's `scopeRole`, which matches
   "holds this role". The raw counts are therefore cumulative and must never be
   summed. `getUserRoleBreakdown` subtracts them into exclusive buckets against
   an unfiltered `meta.total`; the derivation is documented at the call site. Any
   other module that counts users by role needs the same treatment.

5. **Shared-kit follow-ups (outside this module's territory).** Both affect the
   whole app, not only the dashboard, and both are accepted debt here:
   - `DataTable` renders header cells with physical `text-left` / `text-right`,
     so a column header does not follow `dir` in RTL while the body cells (which
     use `text-start` / `text-end`) do. Every table in the app is affected; the
     one-line fix belongs in `src/shared/components/DataTable.vue`.
   - `shared/utils/date.ts` → `formatDate()` hard-codes `toLocaleDateString('en-US')`,
     so due dates render as "Dec 1, 2025" in the Arabic UI. It should take the
     active locale the way `relativeTime()` already does. Every due-date cell and
     timestamp tooltip on the faculty dashboard shows this.

6. **Two server-side bugs are rendered, not hidden** — both are marked in
   `api/dashboardApi.ts` at the call site:
   - `GET /v1/dashboard/archivist` → `ocr_queue` is always `{0,0,0}` because the
     service guards on a `student_documents.ocr_status` column that does not
     exist. The card labels an all-zero payload "not reported yet" rather than
     claiming a quiet day.
   - `GET /v1/faculty-staff/dashboard` → 500s when a pending borrowing exists
     (`getRecentBorrowings()` calls `->format()` on a nullable `due_date`). The
     page turns that specific 500 into a named error with a retry.
   - Same endpoint, `overdue_files[].days_overdue` is `now()->diffInDays($dueDate)`.
     Carbon 3 returns that **signed and fractional**, and the due date is in the
     past, so it arrives negative (`-3.98`). The mapper takes the magnitude; the
     server-side call wants `->diffInDays($dueDate, true)` (or the operands
     swapped) if anyone touches it.

## Deliberate omissions

- **No files-per-month chart.** Nothing in the backend aggregates documents (or
  borrowings) into a time series or per-faculty borrowing split — the only
  `groupBy` clauses in `app/Services` and `app/Http/Controllers` are storage by
  faculty, drawer capacity, `ocr_status` and `pipeline_status`. The two mock
  charts were replaced by a real storage-by-faculty bar chart and a storage
  gauge in the same grid slots, rather than fabricating a series.
- **`useServerTable` is not used.** It is for Laravel-paginated lists; every
  dashboard payload is a single unpaginated aggregate. `useAsyncResource` gives
  each panel its own loading / error / retry instead. The one paginated call,
  `/v1/audit-logs`, is fetched as a fixed top-8 feed, not a browsable table.
- **Toasts are on the refresh action only.** The dashboards are read-only —
  there is no mutation to report.
