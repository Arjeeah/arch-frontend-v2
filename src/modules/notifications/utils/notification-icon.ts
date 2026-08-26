import {
  Bell,
  CircleCheck,
  Clock,
  Copy,
  Database,
  FileX,
  Inbox,
  ShieldAlert,
  TriangleAlert,
} from 'lucide-vue-next'
import type { Component } from 'vue'

/**
 * Backend `icon` slug -> lucide component.
 *
 * The slugs are the complete set emitted by the backend today
 * (`grep -rh "'icon'" app/Notifications/` → alert-triangle, check-circle,
 * clock, copy, database, file-x, inbox, shield-alert). Two of them are
 * lucide's *legacy* names for icons that have since been renamed
 * (`alert-triangle` → `TriangleAlert`, `check-circle` → `CircleCheck`);
 * the glyph is identical, and `TriangleAlert` is the spelling `AppErrorState`
 * already uses.
 *
 * This is an explicit map on purpose. Resolving slugs dynamically against
 * `import * as LucideIcons from 'lucide-vue-next'` also works, but it defeats
 * tree-shaking: Rollup then has to keep the whole icon set, which measured at
 * **611.70 kB (152.26 kB gzip)** as a shared chunk. Because `NotificationsBell`
 * is mounted in `AppHeader` (see WIRING.md), that chunk lands in the *initial*
 * bundle on every page for every user — more than vue-i18n, vue-router, axios
 * and runtime-core combined. Nine named imports cost ~1 kB instead.
 *
 * A slug added server-side that is missing here renders the `Bell` fallback
 * rather than breaking; add it to this map when that happens.
 */
const NOTIFICATION_ICONS: Readonly<Record<string, Component>> = {
  'alert-triangle': TriangleAlert,
  'check-circle': CircleCheck,
  clock: Clock,
  copy: Copy,
  database: Database,
  'file-x': FileX,
  inbox: Inbox,
  'shield-alert': ShieldAlert,
}

/** Resolves a backend `icon` slug (e.g. `check-circle`) to a lucide component, defaulting to `Bell`. */
export function resolveNotificationIcon(icon: string | null): Component {
  if (!icon) return Bell
  return NOTIFICATION_ICONS[icon] ?? Bell
}
