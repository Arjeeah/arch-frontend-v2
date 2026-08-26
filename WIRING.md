# WIRING.md — S10 (landed-module upgrades: `faculties`, `users`, `borrowing`)

This stream upgrades three modules the foundations phase already wired into the router and
sidebar. No routes or sidebar entries changed — everything below is for context/verification,
not new integration work.

## Routes

Unchanged, already present in `src/app/router/index.ts` (outside this stream's territory):

| Path         | Component                                         | `meta.roles`                       |
| ------------ | ------------------------------------------------- | ---------------------------------- |
| `/users`     | `@/modules/users/pages/UserListPage.vue`          | `['super_admin']`                  |
| `/users/:id` | `@/modules/users/pages/UserDetailPage.vue`        | `['super_admin']`                  |
| `/faculties` | `@/modules/faculties/pages/FacultyListPage.vue`   | `['super_admin', 'archivist']`     |
| `/borrowing` | `@/modules/borrowing/pages/BorrowingListPage.vue` | _(none — all authenticated roles)_ |

Verified against backend policies while doing this work:

- `/users` roles match `UserPolicy` exactly (`viewAny`/`create`/`update`/`delete` are all
  `super_admin`-only).
- `/borrowing` being open to every role matches `BorrowingPolicy::viewAny` (`return true`) —
  the controller itself filters `faculty_staff` down to their own requests.
- `/faculties` restricted to `super_admin`+`archivist` is a **frontend-only** restriction:
  `Admin/Academic/FacultyController` has no `authorize()` calls and no dedicated
  `FacultyPolicy` — the backend accepts any authenticated user's requests to
  `/v1/academic/faculties`. Not something this stream can fix (backend, and out of territory
  regardless). Flagging in case it matters for the program.

## Sidebar

Unchanged — no new sidebar entries needed; the existing Faculties/Users/Borrowing items already
point at these routes.

## Notes

Everything below is either informational (things the integrator/backend owner should know) or
already handled inside this stream's own territory — nothing here requires a change outside
`src/modules/{faculties,users,borrowing}/`.

1. **`AuthUser` role/id shape looks stale against the live `UserResource`.**
   `src/modules/auth/types/index.ts` types `AuthUser.role: UserRole` (singular) and
   `AuthUser.id: number`. The backend's `AuthController::login` / `me` both return a
   `UserResource`, whose `toArray()` emits `roles` (plural — every role Spatie's
   `getRoleNames()` resolves, since `assignRoleWithHierarchy()` gives a `super_admin` all three
   role rows) and a UUID `id`, never a singular `role`/numeric `id`. If that's accurate against
   the live API, `useAuthStore`'s `AuthService.login()`/`.me()` would read `user.role` as
   `undefined` at runtime, which breaks role-gated routing, `ROLE_LANDING`, and `AppSidebar`
   sitewide — not something this stream can fix (`src/modules/auth/` is outside S10's
   territory), but worth a priority look since it's upstream of everything role-based.
   `src/modules/users/api/usersApi.ts` shows the fix shape this stream applied to its own
   `UserResource` mapping (a `ROLE_HIERARCHY`-ordered `toRole()`), if useful as a reference.

2. **`UserResource` never serialises `faculties`.** `UserController::store`/`update` both
   `->load(['roles', 'faculties'])` before returning, but `UserResource::toArray()` doesn't
   include a `faculties` key at all. This stream's `usersApi.ts` already defaults to `[]`
   defensively, so the Faculty column/detail block just renders `-` today — no frontend action
   needed, but the "Faculty" column will stay empty until that resource is fixed backend-side.
   The _write_ side (assigning faculties via the create/edit dialog's chip picker) is unaffected
   — it POSTs/PUTs `faculties: number[]` regardless of what the read side returns.

3. **Faculty/User list endpoints ignore `per_page`.** Both `Academic\FacultyController::index`
   and `UserController::index` hardcode `->paginate(10)`, ignoring the `per_page` query param.
   `useServerTable` already trusts the response `meta` over its own requested page size, so
   pagination itself is correct — this only matters if a page-size selector is ever added to
   either list.

No integrator action is required for this stream — routes, sidebar, and locale files are
untouched. i18n fragments (`src/modules/{faculties,users,borrowing}/i18n.fragment.json`) are
ready to merge into `src/locales/{en,ar}.json` under their respective top-level keys.
