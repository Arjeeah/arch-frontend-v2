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
  path: 'settings/:group?',
  component: () => import('@/modules/settings/pages/SettingsPage.vue'),
  meta: { roles: ['super_admin'] },
},
```

The optional `:group` param matters: the backend sends a
`/settings/storage` deep link on its storage-capacity notification (see
Notes). `SettingsPage` reads the param to pick the opening tab and falls
back to `general` for a bare `/settings` or an unrecognised group, so
registering it as plain `settings` still works — it just makes that one
notification land on the wrong tab.

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

And the notifications entry — CLAUDE.md requires every route to have a
matching sidebar entry with the same `roles`, so this one is **required, not
optional**:

```ts
{
  key: 'notifications',
  labelKey: 'nav.notifications',
  icon: Bell,                 // from 'lucide-vue-next'
  to: '/notifications',
  // no roles — every authenticated role sees their own notifications
},
```

Position: top-level, last. Unlike `nav.settings`, `nav.notifications` is
**not** in the locale files yet — add it to both, in the `nav` block:

| file                  | key                 | value           |
| --------------------- | ------------------- | --------------- |
| `src/locales/en.json` | `nav.notifications` | `Notifications` |
| `src/locales/ar.json` | `nav.notifications` | `الإشعارات`     |

(These are shell-chrome keys in the `nav` namespace, not module keys, so
they are not in this module's `i18n.fragment.json` — the fragments only
carry the `notifications.*` / `settings.*` namespaces.)

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

- **Notification `action_url`s use a different URL vocabulary than this
  router — please reconcile.** The backend builds deep links from its own
  paths (`grep -rh "'action_url'" app/Notifications/`), and most of them are
  not routes this frontend serves:

  | backend `action_url`              | frontend route today     | status                                                     |
  | --------------------------------- | ------------------------ | ---------------------------------------------------------- |
  | `/settings/storage`               | `settings/:group?` (S8)  | ✅ works once the route above is registered with the param |
  | `/borrowings/{id}`                | `/borrowing` (list only) | ❌ no detail route — S10 owns borrowing                    |
  | `/student-documents/{id}`         | —                        | ❌ no route — S4 owns student documents                    |
  | `/audit-logs?action=failed_login` | `/audit`                 | ❌ path mismatch — S6/audit owns it                        |

  Until they line up, this module **does not** navigate to an unmatched path
  (that would drop the user on the 404 catch-all). `utils/action-route.ts`'s
  `resolveActionRoute` resolves the URL first and, when it only matches the
  `not-found` route, the UI shows `notifications.toasts.noDestination`
  instead of navigating. Nothing
  breaks; the links simply stay inert. Fixing it is a one-line change per row
  once the owning stream's routes land — either add the missing routes under
  the backend's paths, or add redirect routes (`/borrowings/:id` →
  `/borrowing`, `/audit-logs` → `/audit`). No change needed inside this
  module either way.

- **These two modules are invisible to `npm run build` until the routes above
  are registered.** Nothing in `src/app/` imports them, so Rollup never pulls
  them into the graph and the build emits no `NotificationsListPage` /
  `SettingsPage` chunk — a build that "passes" proves nothing about this code.
  To gate them, add the routes first (or temporarily), then build and confirm
  both chunks appear.

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
