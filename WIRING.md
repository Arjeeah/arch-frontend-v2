# WIRING.md — S8 (notifications, settings)

What the phase-3 integrator needs to add outside `src/modules/notifications/`
and `src/modules/settings/` to bring these two screens online.

## Routes

Add to `src/app/router/index.ts`, inside the `/` layout route's `children`:

```ts
{
  path: 'notifications',
  component: () => import('@/modules/notifications/pages/NotificationsListPage.vue'),
  // no meta.roles — every authenticated role can see their own notifications
},
{
  path: 'settings',
  component: () => import('@/modules/settings/pages/SettingsPage.vue'),
  meta: { roles: ['super_admin'] },
},
```

`/settings` was a real route before the foundations phase removed it as a
dead link (see `05c2c0c fix(router): role-based landing…`) — same path,
same role gate (`super_admin` only), now backed by a real page.

## Sidebar

Add to `src/shared/components/AppSidebar.vue`'s `navItems`, restoring the
entry the same commit removed:

```ts
{
  key: 'settings',
  labelKey: 'nav.settings',   // already present in both locale files — no fragment key needed
  icon: Settings,             // from 'lucide-vue-next'
  to: '/settings',
  roles: ['super_admin'],
},
```

Position: top-level, after the `audit` entry (its previous position).

**Notifications has no sidebar entry.** It never had one before the removal
either — the header bell (see Notes below) is the only previous entry
point, and its dropdown's "View all notifications" link covers the rest.
If you'd rather also expose a sidebar item, add a `nav.notifications` key
to both locale files (EN "Notifications" / AR "الإشعارات" is a reasonable
pair) and a nav item with icon `Bell`, no `roles` (open to everyone), `to: '/notifications'`.

## Notes

- **Import `NotificationsBell` into `AppHeader`.** `AppHeader.vue` currently
  renders a static bell icon with a hardcoded red dot (no dropdown, no real
  unread count). Replace that block with:

  ```ts
  import { NotificationsBell } from '@/modules/notifications'
  ```

  ```html
  <NotificationsBell />
  ```

  in place of the `<!-- Notification bell -->` `<div>` block. This is the
  router-layer exception (app → module imports are legal there); `AppHeader`
  itself is out of this module's territory so the swap happens on your side.
  The component is self-contained: own dropdown, own 60s poll (cleared on
  unmount), own unread badge sourced from a small Pinia store shared with the
  full notifications page, so mark-read/mark-all/delete done from either
  place stays in sync.

- **`overrideCapacity`'s payload needs both `reason` and `new_limit`.**
  phase2-specs.md's one-line endpoint summary only lists `{reason}`, but the
  actual `SpatieSettingsController::overrideCapacity()` validates
  `reason` (`required|string|max:255`) **and** `new_limit`
  (`required|integer|min:1|max:100`) — confirmed against both the
  controller and `SpatieSettingsTest::test_archivist_can_override_capacity_threshold`.
  `OverrideCapacityDialog.vue` collects both; nothing further needed.

- **Two settings systems exist server-side.** `routes/api/v1.php` exposes
  both `admin/settings/*` (`SettingsController`, older/custom) and
  `settings/*` (`SpatieSettingsController`, the Spatie laravel-settings
  system with 7 groups). Per phase2-specs.md's S8 section, this module only
  implements the latter (`/v1/settings/*`). The older controller is
  untouched and unused by this UI.

- **Backend allows `archivist` to call override-capacity too**
  (`hasRole(['super_admin', 'archivist'])` in the controller,
  confirmed by the test suite), but the whole `/settings` route here is
  gated to `super_admin` only per phase2-specs.md ("Roles: settings
  super_admin"). Archivists therefore have no UI path to this action in the
  current wiring — flagged in case product wants a quick "raise capacity"
  action reachable from the archivist dashboard (S5) instead.
