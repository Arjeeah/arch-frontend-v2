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

Ordered by what would hurt most if it shipped unread.

### Backend bugs that make the frontend look broken

1. **`AuthUser` role/id shape is wrong against the live API — this breaks role-gating
   sitewide, not just here.** `src/modules/auth/types/index.ts` types
   `AuthUser.role: UserRole` (singular) and `AuthUser.id: number`, and
   `AuthService.login()` reads `data.user`. The backend's `Admin\Auth\AuthController::login`
   returns `(new UserResource($user))->additional(['token' => …])`, i.e.
   `{ data: {…}, token, message }` — there is no `user` key, `id` is a UUID string, and the
   role arrives as `roles` (plural: `assignRoleWithHierarchy()` gives a `super_admin` all
   three role rows, so `getRoleNames()` returns all of them). `AuthService.me()` additionally
   calls `/v1/me`, which is not in `routes/api/v1.php` at all.

   Consequence: `authStorage.setUser(undefined)` on login, so `authStore.user` is null and
   `user.role` is `undefined` — the router guard, `ROLE_LANDING` and `AppSidebar` all lose
   their role input. `src/modules/auth/` is outside S10's territory, so this stream cannot fix
   it; **it should be the integrator's first fix.** `src/modules/users/api/usersApi.ts` has the
   mapping shape to copy (a `ROLE_HIERARCHY`-ordered `toRole()`).

   S10 hardened what it owns: `src/modules/borrowing/utils/currentActor.ts` now accepts either
   a singular `role` or a plural `roles[]` on the stored session and resolves the highest role
   via the backend's own hierarchy order, so the borrowing workflow gate starts working the
   moment a usable session object is persisted — in either shape.

2. **The Users list "Active" status filter returns every user, active or not.**
   `UserController::index` allowlists `'status'` as a bare string, and
   `spatie/laravel-query-builder` v6 turns a bare string into `AllowedFilter::partial`
   (`Concerns/FiltersQuery::allowedFilters`). `FiltersPartial` emits
   `LOWER("users"."status") LIKE '%active%'`, which matches `inactive` as well. Selecting
   **Inactive** works; selecting **Active** is a no-op. There is no exact `status` filter to
   switch to, and filtering client-side would corrupt the server's page counts, so the filter
   is left wired as-is. **Backend fix:** `AllowedFilter::exact('status')`, exactly as
   `Academic\FacultyController::index` already does (that list is unaffected).

3. **`UserResource` never serialises `faculties`.** `UserController::store`/`update` both
   `->load(['roles', 'faculties'])` before returning, but `UserResource::toArray()` has no
   `faculties` key. `usersApi.fromResource` defaults to `[]`, so the Faculty column and the
   detail block render `-` and the edit dialog's chip picker always opens empty.

   This had a sharp edge, now fixed: `toPayload` used to send `faculties: []` for an untouched
   picker, and both `UserStoreRequest`/`UserUpdateRequest` validate `faculties` as
   `array|min:1` — `nullable` exempts only `null`, so a literal `[]` still fails `min:1` and
   **422'd every user edit**. The key is now omitted when empty (leaving the server-side
   assignment untouched) and the dialog says so on edit. The remaining debt is cosmetic: until
   the resource emits `faculties`, an admin cannot see a user's current faculties anywhere,
   and picking any faculty on edit replaces the whole assignment rather than adding to it.

4. **`filter[role]` matches inherited roles, not the acting role.** `AllowedFilter::scope('role')`
   resolves through Spatie's `HasRoles::scopeRole`, and because `assignRoleWithHierarchy()`
   writes every lower role row too, filtering by `faculty_staff` also returns every archivist
   and super admin. The list's Role column shows the _highest_ role (`toRole()`), so a filtered
   list can legitimately look like it ignored the filter. Backend-side call; nothing to do here.

5. **Faculty/User list endpoints ignore `per_page`.** `Academic\FacultyController::index` and
   `UserController::index` both hardcode `->paginate(10)`. `useServerTable` trusts the response
   `meta` over its own requested size, so pagination is correct — but a page-size selector on
   either list would silently do nothing. It also means the users module's faculty lookup
   cannot ask for every faculty in one request; `usersApi.facultyOptions()` walks the pages
   (bounded at 10) instead of trusting a `per_page` the server discards.

6. **`/faculties` is a frontend-only restriction.** `Admin\Academic\FacultyController` has no
   `authorize()` calls and no `FacultyPolicy`, so the backend accepts faculty writes from any
   authenticated user — including `faculty_staff`. The route's
   `meta.roles: ['super_admin','archivist']` is the only thing stopping them. Flagging for the
   program; not fixable from the frontend.

### Accepted debt inside this stream

- **`AppConfirmDialog`'s Cancel button is hardcoded English.** The component has no
  `cancelLabel` prop and `src/shared/` is outside this stream's territory, so the delete and
  reject confirmations show an English "Cancel" under an Arabic UI. Needs a one-line prop on
  the shared component; every module using it is affected, not just these three.
- **`formatDate` always formats `en-US`.** `src/shared/utils/date.ts` takes no locale, so the
  Created At / Due Date / Borrowed At / Returned At cells stay English-formatted in Arabic.
  Same shared-territory constraint; the fix belongs with `relativeTime`, which does take one.
- **Faculties' "Programs" column is an em dash for every row.** `FacultyResource` sends no
  programs relation and no count, and deriving one would cost a
  `/v1/academic/programs?filter[faculty_id]=` request per row. `Faculty.programsCount` is typed
  `number | null` and mapped to `null` — deliberately _not_ `0`, which would render a claim the
  API never made. Wire the real count and the column starts working with no UI change.
- **The four borrowing stat cards count the loaded page only.** There is no borrowings stats
  endpoint, and totalling every page would defeat server pagination. Their sublabels now say
  "this page only" in both locales rather than reading as system-wide totals.
- **The borrowing search box only narrows the loaded page.** `BorrowingController::index`
  exposes no partial filter (`status`, `user_id`, `student_document_id`, `overdue` are all
  exact), so there is nothing to search server-side. The placeholder says "Search this page…"
  and a distinct "no matches on this page" empty state now explains an empty result.
- **The faculty chip picker lists active faculties only.** An inactive faculty a user is
  already assigned to cannot be re-selected, so an edit that touches the picker would drop it.
  Low impact while the read side returns nothing anyway; revisit together with note 3.
- **One search box, two backend filters.** `filter[name]`/`filter[email]` (users) and
  `filter[name_ar]`/`filter[name_en]` (faculties) are separate filters with no OR between
  them, so each search box picks a lane: a _complete_ email address searches by email
  (`UserController::index` validates `filter.email` with Laravel's `email` rule, so a
  half-typed address 422s the whole list — hence "complete"), Arabic script searches
  `name_ar`. Everything else searches by name. There is no faculty `code` filter at all.

### Integrator checklist

Nothing outside `src/modules/{faculties,users,borrowing}/` changed. The only handoff is the
i18n fragments — merge `src/modules/{faculties,users,borrowing}/i18n.fragment.json` into
`src/locales/{en,ar}.json` under their `faculties` / `users` / `borrowing` top-level keys
(en and ar are key-for-key identical, 45 / 69 / 80 leaf keys, placeholders matched, and every
message was rendered through vue-i18n in both locales to confirm none fail to compile).
