# WIRING — integration index

Ten module streams (`fc/s1` … `fc/s10`) each shipped a `WIRING.md` at the repo
root describing the work they could not do from inside their own territory.
They are preserved verbatim under `docs/wiring/`; this file
records what was applied centrally and what is still outstanding.

| file                        | stream | modules                                       |
| --------------------------- | ------ | --------------------------------------------- |
| `docs/wiring/WIRING-s1.md`  | S1     | `search`                                      |
| `docs/wiring/WIRING-s2.md`  | S2     | `pipeline` (bulk import + monitor)            |
| `docs/wiring/WIRING-s3.md`  | S3     | `review`                                      |
| `docs/wiring/WIRING-s4.md`  | S4     | `students`, `student-documents`               |
| `docs/wiring/WIRING-s5.md`  | S5     | `dashboard` (role landings)                   |
| `docs/wiring/WIRING-s6.md`  | S6     | `locations` (rooms/cabinets/drawers)          |
| `docs/wiring/WIRING-s7.md`  | S7     | `document-types`, `programs`                  |
| `docs/wiring/WIRING-s8.md`  | S8     | `notifications`, `settings`                   |
| `docs/wiring/WIRING-s9.md`  | S9     | `reports`, `imports`                          |
| `docs/wiring/WIRING-s10.md` | S10    | upgrades to `faculties`, `users`, `borrowing` |

## Applied

- **Routes** — every route from every manifest is registered in
  `src/app/router/index.ts` as a child of the `/` layout, grouped by workflow.
  The 404 catch-all stays last and inside the layout.
- **Sidebar** — `src/shared/components/AppSidebar.vue` carries an entry for
  every routed screen, with the icon, roles and position each manifest asked
  for. Every icon was checked against the installed `lucide-vue-next@1.0.0`.
  `nav.documentTypes` uses `FileType` rather than the `FileStack` S7 suggested,
  because S4 had already claimed `FileStack` for student documents.
- **Notifications bell** — `AppHeader` grew a `#notifications` slot (static bell
  as fallback) and `DashboardLayout` fills it with the module's
  `NotificationsBell`, per S8's shape. `app` may import a module; `shared` may
  not.
- **i18n** — all 16 `i18n.fragment.json` files are merged into
  `src/locales/{en,ar}.json`, plus the three shell-chrome `nav.*` keys no
  fragment carried (`nav.programs`, `nav.documentTypes`, `nav.notifications`).
  The fragments are left in place as provenance; re-merging them is idempotent.
- **`ROLE_LANDING.faculty_staff` → `/dashboard`** (S5, required). All three
  roles now land on the dispatcher.
- **Auth login mapping** (S5 note 2 / S10 note 1, the blocker both streams
  flagged as the integrator's first fix). `AuthService.login` now reads the real
  `{ data, token }` envelope, treats `users.id` as the UUID string it is, and
  reduces the hierarchical `roles[]` array to one effective role.
- **Notification deep links** — `/borrowings/:id` and `/audit-logs` are
  registered as redirects onto the routes this app actually serves, so the
  backend's `action_url` vocabulary resolves instead of hitting the 404
  catch-all.
- **Shared-kit i18n and RTL pass.** Every stream reported the same handful of
  `src/shared/` gaps, which no stream owned. `AppConfirmDialog`'s Cancel,
  `DataTable`'s "Loading…"/"No data", `AppErrorState`'s defaults and
  `AppFileUpload`'s labels and rejection reasons all go through `t()` now (new
  keys under `common.*`); `DataTable`'s headers and `AppSelect`'s chevron use
  logical utilities; `formatDate` follows the active locale by reading
  `<html lang>`, which `setLocale()` already maintains.

## Fixed during integration

- **`search` ids were typed as integers.** `document_contents.id`,
  `student_documents.id` and `students.id` are all `uuid` columns. The module's
  mapper ran `student_id` through `Number()`, which yields `NaN` for a UUID and
  was mapped to `null` — so every search hit lost its link to the student.
  Retyped as strings and passed through unchanged.
- **`settings.fields.passwordPolicyHelper` was eaten by vue-i18n.** The string
  demonstrates pipe-delimited rules (`min:8|mixed_case|numbers`), and `|` is
  vue-i18n's plural separator, so the message rendered as `"mixed_case"` in
  English and `"، مثل min:8"` in Arabic. Escaped as `{'|'}` in the locale files
  and in S8's fragment.

### Live-API verification round (`verify/v1` … `verify/v5`)

Five streams re-checked their modules against a running backend. Their
module-local fixes are in their own commits; these are the items that landed in
shared territory (`src/app/`, `src/shared/`, `src/locales/`) and so could only
be applied centrally:

- **The router guard did not use `readSessionRole()`.** `sessionRole.ts`
  documents itself as "the same source the router guard decides on", and three
  call sites in `src/app/router/index.ts` read `authStorage.getUser()?.role`
  instead. Identical today (the login mapper persists a scalar), but a session
  still carrying the wire's `roles[]` array resolved to `undefined` and bounced
  the user off every `meta.roles` route while `AppSidebar` hid every gated item.
  The guard now calls `roleAllowed()`, and `useAuthStore`'s `role` getter falls
  back to `readSessionRole()` so the sidebar cannot disagree with the guard.
- **`authStore.init()` no longer awaits `GET /v1/me`.** See "Still outstanding".
- **`users.dialog.errors.emailDomain`** (new key, en + ar + fragment).
  `CreateUserDialog` now rejects a non-`@limu.edu.ly` address before the round
  trip, instead of surfacing the backend's English 422 inside an Arabic dialog.
  The check is case-sensitive because `ends_with` is: `probe@LIMU.EDU.LY` was
  verified to 422 as well. It is skipped when the email is unchanged on an edit,
  matching `usersApi.toUpdateInput`, so the two seeded `@limu.local` accounts
  stay editable.
- **`documentTypes.conditions.custom` / `.customTooltip`** (new keys, en + ar +
  fragment). A row whose `requirement_conditions` the builder cannot express
  (two seeded rows hold the legacy `{"applies_to": …}` shape) rendered the same
  "—" as a row with no rule at all. It now shows a "Custom rule" chip whose
  tooltip says the rule survives an edit untouched.
- **`shared/utils/date.ts` gained a verified timezone caveat**, replacing an
  assumption. No behaviour changed: the API was checked and emits **no** bare
  `yyyy-mm-dd` and no zone-less `Y-m-d H:i:s` — `due_date` included, which is a
  full ISO instant. The one boundary shape is a date this app's own picker
  produces (`submitted_at: "2026-08-26"` is stored and returned as
  `2026-08-26T00:00:00.000000Z`); the note explains why that is a backend
  question and why patching one function here would only desynchronise the
  picker from the table.

## Still outstanding

Backend changes, flagged by the streams and unchanged by integration — see the
per-stream files for the detail:

- `ReviewQueueResource` does not send the refinement id, so Verify/Save on the
  review queue 404 (S3 note 1). **Mitigated on the frontend**: the mapper no
  longer substitutes `document_id` (which addressed the wrong table and
  guaranteed a 404), and the page disables both write actions with an
  explanation. Adding `'refinement_id' => $refinement?->id` to the resource is
  a one-line change and lights the screen up with no further frontend edit.
- `ReportType::filterSchema()` still mis-declares `document_type_id` as
  `integer` though the column is a uuid. The `(int)` cast in
  `StudentDocumentsExport::query()` that made the filter unusable **is gone** —
  verified end-to-end against the live API (36 rows filtered against 337
  unfiltered) — so `UNSUPPORTED_FILTER_KEYS` is now empty and the filter is
  offered again. Only the label is wrong; `FIELD_TYPE_OVERRIDES` in
  `ReportFilterField` corrects it and can be deleted once the schema is fixed.
- `UserController::index` allowlists `status` as a partial filter, so the Users
  list's "Active" option also matches `inactive` (S10 note 2).
- `UserResource` omits `faculties`, so a user's current faculties are not
  visible anywhere (S10 note 3).
- `/v1/me` is not routed —
  `404 {"message":"The route api/v1/me could not be found."}` for every role.
  `useAuthStore.init()` no longer calls it: it rehydrates from `authStorage`,
  which is what boot fell back to anyway, and the app's only console error is
  gone. `AuthService.me()` is kept and still correct; re-await it in `init()`
  the day the route is registered.
- `FacultyController` / `ProgramController` / `UserController` hardcode
  `paginate(10)` and ignore `per_page`; several lookups page-walk because of it.
- `/v1/academic/faculties` has no policy — `/faculties` is a frontend-only
  restriction (S10 note 6).
- **Archivists can call `POST /v1/settings/storage/override-capacity` but
  cannot reach it.** Verified live: the archivist token gets `422` (a validation
  error, i.e. authorized) on that endpoint while `GET /v1/settings` answers
  `403`. The frontend gates `settings/:group?` to `super_admin`, which matches
  every _other_ settings endpoint, so the dialog is unreachable for the one role
  the backend lets use it. Deliberately not "fixed" by widening the route —
  that would hand archivists the whole settings screen. It needs either a
  read-scoped settings endpoint for archivists or a standalone capacity dialog.
- `student_documents` cannot be **filtered or sorted** by `pipeline_status` —
  `?filter[pipeline_status]=…` is a `400 InvalidFilterQuery`, so that parameter
  must never be sent. The _reading_ half of this is retired:
  `StudentDocumentResource` now ships `pipeline_status`, `_label` and `_error`
  on the list, so the monitor no longer hydrates per row (the N+1 is gone).

## Adversarial audit — outcomes

Four reviewers audited routing/roles, i18n/RTL, backend-contract fidelity and
project standards after the merge. Everything they raised is either fixed in
the commits above or recorded below.

### Accepted debt

- **`getApiErrorMessage`'s bare default is still the English literal
  `'Something went wrong'`.** `src/shared/` may not import `src/app/`, so the
  helper cannot translate. Every production call site passes a `t(...)`
  fallback (verified: no string-literal fallback remains outside
  `src/pages/dev/`), and the helper now prefers that fallback over axios's own
  English `err.message`, so the default is unreachable in practice. Fixing it
  properly means threading a translator through 80 call sites for a string
  nobody can reach.
- **`SearchForm.vue`'s query box is a sixth, un-extracted search input.** Five
  list-page copies became `AppSearchInput`; this one is genuinely a different
  control — it forces `dir="rtl"` regardless of UI language (the archive is
  Arabic), carries a clear button and a length hint, and sits beside an
  explicit submit button because every search costs an embedding call.
  Extracting it would mean a variant prop that no second caller wants.
- **Two notification bodies keep a mixed provenance.** `SecurityAlert` and
  `StorageCapacityWarning` interpolate runtime values into their `body`; the
  frontend re-renders both from `data` (`failure_count`, `attempted_email`,
  `current_percent`), so they are fully translated — but any _new_ backend
  notification whose body interpolates will fall back to the server's English
  string until its `notifications.types.*` keys and any new `data` params are
  added.

### Rejected

- **"`src/composables/usePagination.ts` is dead code — delete it."** It is not
  dead: `tools/plop/generators/module.ts:626` emits
  `import { usePagination } from '@/composables/usePagination'` into every
  generated list page, and `tools/scripts/smoke-test-gen.ts` type-checks that
  output in CI. Deleting the file would break the generator and the smoke test.
  CLAUDE.md's description of it as the legacy client-side pagination helper is
  accurate and stays.
- **"Nine notification classes ship English titles."** Eight, not nine.
  `WeeklyDigestNotification::via()` returns `['mail']`, so it never reaches the
  database channel the bell and `/notifications` read; it has no in-app copy to
  translate.
