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

## Still outstanding

Backend changes, flagged by the streams and unchanged by integration — see the
per-stream files for the detail:

- `ReviewQueueResource` does not send the refinement id, so Verify/Save on the
  review queue 404 (S3 note 1).
- `StudentDocumentsExport::query()` casts `document_type_id` with `(int)`, so
  that report filter can never match a UUID (S9 note 8).
- `UserController::index` allowlists `status` as a partial filter, so the Users
  list's "Active" option also matches `inactive` (S10 note 2).
- `UserResource` omits `faculties`, so a user's current faculties are not
  visible anywhere (S10 note 3).
- `/v1/me` is not routed, so `authStore.init()` always fails (harmlessly).
- `FacultyController` / `ProgramController` / `UserController` hardcode
  `paginate(10)` and ignore `per_page`; several lookups page-walk because of it.
- `/v1/academic/faculties` has no policy — `/faculties` is a frontend-only
  restriction (S10 note 6).
- `student_documents` cannot be filtered or sorted by `pipeline_status`, which
  is why the pipeline monitor hydrates per row (S2 note 2).
