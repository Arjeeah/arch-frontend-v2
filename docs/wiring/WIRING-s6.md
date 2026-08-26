# WIRING.md — S6 Locations (rooms / cabinets / drawers)

Everything the phase-3 integrator needs to wire this module into the app shell
(`src/app/router/index.ts`, `src/shared/components/AppSidebar.vue`,
`src/locales/{en,ar}.json`). Nothing in this module's own territory
(`src/modules/locations/`) needs any further edits for these three items to
work — this file only lists the outside-territory wiring.

## Routes

Add to the `children` array of the `/` `DashboardLayout` route in
`src/app/router/index.ts`, alongside the other feature routes:

```ts
{
  path: 'archive-room',
  component: () => import('@/modules/locations/pages/RoomsPage.vue'),
  meta: { roles: ['super_admin', 'archivist'] },
},
{
  path: 'archive-room/rooms/:roomId',
  component: () => import('@/modules/locations/pages/RoomCabinetsPage.vue'),
  meta: { roles: ['super_admin', 'archivist'] },
},
{
  path: 'archive-room/cabinets/:cabinetId',
  component: () => import('@/modules/locations/pages/CabinetDrawersPage.vue'),
  meta: { roles: ['super_admin', 'archivist'] },
},
```

Notes:

- `/archive-room` is the path `AppSidebar.vue`'s existing comment already
  reserves for this module ("Waiting on their modules … archive room
  (`/archive-room`)") — used verbatim, not a new path.
- `RoomCabinetsPage` reads `route.params.roomId`; `CabinetDrawersPage` reads
  `route.params.cabinetId` and an optional `route.query.roomId` (carried by
  this module's own in-page navigation — see Notes below). No router-level
  handling needed for the query param, it just rides along.
- All three routes are read/write CRUD screens for archivist + super_admin
  only, per the phase-2 spec for this stream. `faculty_staff` never sees
  this section (and isn't linked to it from anywhere else in the app).

## Sidebar

Add one top-level item to `navItems` in `src/shared/components/AppSidebar.vue`
(the existing comment there already names this exact slot):

```ts
{
  key: 'archive-room',
  labelKey: 'nav.archive',
  icon: Archive, // import { Archive } from 'lucide-vue-next'
  to: '/archive-room',
  roles: ['super_admin', 'archivist'],
},
```

- `nav.archive` already exists in both `src/locales/en.json`
  ("Archive Room") and `src/locales/ar.json` ("غرفة الأرشيف") — added ahead
  of this module landing, per the comment in `AppSidebar.vue`. No locale
  edit needed for the nav label itself.
- Position: this module has no opinion on exact ordering; suggest placing it
  after "Faculty Management" and before "Audit Logs", matching where
  physical-archive-adjacent features would naturally sit, but any position is
  fine functionally.
- Only the top-level item is needed — `RoomCabinetsPage` and
  `CabinetDrawersPage` are reached by drilling down from `RoomsPage`
  (row click / chevron), not via separate sidebar entries.

## i18n

Merge `src/modules/locations/i18n.fragment.json` into `src/locales/en.json`
and `src/locales/ar.json` under the top-level `locations` key (101 keys per
locale, verified 1:1 parity — see the module's own notes below). Neither locale
file currently has a top-level `locations` key, so nothing collides.

## Notes

- **Cross-page room context for the drawers page.** `DrawerResource` and
  `CabinetResource` never send `room_id` / `cabinet_id` back on the wire (see
  `src/modules/locations/types.ts` for the full explanation) — only display
  names (`Cabinet.roomName`, `Drawer.cabinetName`). So `CabinetDrawersPage`
  cannot build a "back to this cabinet's room" link from the cabinet alone.
  This module works around it entirely inside its own territory: when
  `RoomCabinetsPage` links to a cabinet's drawers, it appends
  `?roomId=<id>` to the URL; `CabinetDrawersPage` reads that query param for
  its back-link and falls back to `/archive-room` when it's absent (e.g. a
  drawer page opened from a bookmark/direct URL). No action needed from the
  integrator — flagging it here only so a future "deep link to a drawer"
  feature elsewhere in the app knows to pass `roomId` too, if it wants the
  precise back-link to work.
- **No Pinia store.** This module skips the generator's usual
  `stores/use<Module>Store.ts` — list state comes entirely from
  `useServerTable` (one instance per browse level) and mutations call the
  api files directly from the page components, reporting through
  `useToasts()`. Nothing outside this module depends on locations state, so
  there was nothing a store would have centralized.
- **Shared code still renders hardcoded English**, which shows up on this
  module's screens in Arabic. All of it is in `src/shared/`, outside this
  stream's territory, and affects every module equally — so it belongs to
  whoever owns the shared-component i18n pass, not here. Flagged so none of it
  is mistaken for a locations bug:
  - `AppConfirmDialog`'s "Cancel" button (the confirm label _is_ translated —
    it's a prop, and this module passes it).
  - `DataTable`'s "Loading…" row. Its "No data" fallback is unreachable here:
    all three lists render `AppEmptyState` instead of the table when empty.
  - `useServerTable`'s `'Could not load this list'` fallback, used when a failed
    list request carries no server message. The module's own non-list failures
    (`loadRoom` / `loadCabinet`) pass a `t()` fallback and are unaffected.

  Where a shared component takes the string as a **prop**, this module already
  passes a translated one — `AppErrorState`'s `title` / `retryLabel` and
  `AppEmptyState`'s `title` / `description` are all fed from the fragment rather
  than left on their English defaults.

- **`AppSelect` does not forward `id` to its `<select>`.** The form dialogs pass
  `id="…"` alongside `FormField`'s `field-id`, but `AppSelect` declares no `id`
  prop, so the attribute falls through onto the wrapper `<div>` and the
  `<label for>` does not focus the control. Cosmetic a11y gap, shared-component
  shape, same for every module pairing `FormField` with `AppSelect`.
- **`npm run build` does not exercise this module yet.** Until the routes above
  are wired, nothing imports these pages, so Rollup tree-shakes all of them out
  and the build emits no locations chunk. `npm run type-check` _does_ cover them
  (`tsconfig.app.json` includes `src/**/*`), so the type safety is real — but
  treat a green build as meaningful for this module only after the routes land.
- **The API itself is not role-gated.** `/v1/location/*` sits behind
  `auth:sanctum` only (`routes/api/v1.php`) with no role middleware and
  `authorize(): true` on all six form requests, so the archivist+super_admin
  restriction is enforced purely by `meta.roles` and the sidebar entry above.
  That matches the spec for this stream; noted so it isn't read as a backend
  guarantee.
- **Backend quirks this module works around** (documented at the api boundary,
  where CLAUDE.md says per-endpoint quirks live): `rooms.canvas_data` is a JSON
  column cast to `array` but validated as `nullable|string`, so nothing can
  round-trip it — `roomsApi` neither reads nor sends it. `drawers.capacity` is
  `NOT NULL DEFAULT 100` while `DrawerStoreRequest` marks it `nullable`, so
  `drawersApi.create` omits the key rather than sending an explicit null (which
  passes validation and then 500s on the constraint).
- **Backend is offline for this stream**, so every wire assumption was confirmed
  by reading the backend source rather than by a live round-trip. All of them
  did resolve statically, so there are **no `// verify against live API` markers
  left in this module** — the earlier ones sat on the `status` narrowing, which
  `App\Enums\Status` (a string-backed `active`/`inactive` enum, cast by all
  three models) settles outright. Specifically confirmed: the `{ data, meta }`
  envelope on index (`Resource::collection($paginator)`) and the `{ data }`
  envelope on show/store/update (`ApiResponse::resource()`); the capitalised
  `Room` / `Cabinet` keys; `capacity_status` / `capacity_color`; and that Spatie
  reads filters only under `filter[...]`, which axios 1.x's default serializer
  produces from the nested `params.filter` object these api files send.
