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
and `src/locales/ar.json` under the top-level `locations` key (99 keys per
locale, verified 1:1 parity — see the module's own notes below). No key
collides with anything already in either locale file.

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
- **Two shared components still render hardcoded English**, which shows up on
  this module's screens in Arabic: `AppConfirmDialog`'s "Cancel" button and
  `DataTable`'s "Loading…" / "No data" fallbacks. Both are in `src/shared/`,
  outside this stream's territory, and they affect every module equally — so
  they belong to whoever owns the shared-component i18n pass, not here.
  Flagged so the delete-confirm dialogs on this module's three lists aren't
  mistaken for a locations bug.
- **Backend quirks this module works around** (documented at the api boundary,
  where CLAUDE.md says per-endpoint quirks live): `rooms.canvas_data` is a JSON
  column cast to `array` but validated as `nullable|string`, so nothing can
  round-trip it — `roomsApi` neither reads nor sends it. `drawers.capacity` is
  `NOT NULL DEFAULT 100` while `DrawerStoreRequest` marks it `nullable`, so
  `drawersApi.create` omits the key rather than sending an explicit null (which
  passes validation and then 500s on the constraint).
- **Backend is offline for this stream** — every wire assumption below is
  either taken directly from reading the backend controllers/requests/
  resources, or flagged `// verify against live API` in the source where it
  couldn't be confirmed statically (see `src/modules/locations/api/*.ts`).
