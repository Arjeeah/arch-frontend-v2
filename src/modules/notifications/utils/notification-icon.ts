import * as LucideIcons from 'lucide-vue-next'
import { Bell } from 'lucide-vue-next'
import type { Component } from 'vue'

// Every icon name observed on the backend (`grep -n "'icon' =>" app/Notifications/*.php`)
// is a kebab-case lucide icon slug — 'inbox', 'alert-triangle', 'clock',
// 'check-circle', 'database', 'shield-alert', 'copy', 'file-x'. Rather than
// hand-maintain a lookup table that silently goes stale as new notification
// types are added server-side, this resolves any kebab-case slug against the
// full lucide-vue-next export map at runtime and falls back to a bell.
const iconRegistry = LucideIcons as unknown as Record<string, Component>

function toPascalCase(kebab: string): string {
  return kebab
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

/** Resolves a backend `icon` slug (e.g. `check-circle`) to a lucide component, defaulting to `Bell`. */
export function resolveNotificationIcon(icon: string | null): Component {
  if (!icon) return Bell
  return iconRegistry[toPascalCase(icon)] ?? Bell
}
