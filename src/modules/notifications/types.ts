// Types for the Notifications module.
// These are the camelCase shapes the UI works with — `api/notificationsApi.ts`
// maps them to/from the backend's snake_case wire format
// (`App\Http\Resources\NotificationResource`).

/**
 * Values observed across every `App\Notifications\*` class in the backend
 * (`grep -n "severity" app/Notifications/*.php`). `NotificationResource`
 * defaults an absent value to `'info'`, which `toSeverity` in the api file
 * mirrors for any value outside this set.
 */
export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error'

export interface AppNotification {
  id: string
  /** Fully-qualified backend notification class, e.g. `App\Notifications\BorrowingApprovedNotification`. */
  type: string
  title: string
  body: string
  /**
   * A path within this same frontend app (e.g. `/borrowings/12`,
   * `/settings/storage`) — every `action_url` observed in the backend's
   * notification classes is a relative in-app route, never an external URL,
   * so consumers can pass it straight to `router.push`.
   */
  actionUrl: string | null
  /** kebab-case lucide icon name, e.g. `check-circle`. See `utils/notification-icon.ts`. */
  icon: string | null
  severity: NotificationSeverity
  referenceId: string | null
  /**
   * The backend's raw `toDatabase()` payload. Used to fill the runtime values
   * in a translated body — see `utils/notification-copy.ts`.
   */
  data: Record<string, unknown>
  /** `null` while unread. */
  readAt: string | null
  createdAt: string | null
}
