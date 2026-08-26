/**
 * Titles and bodies for the backend's notification classes.
 *
 * Every `App\Notifications\*` class hardcodes English in `toDatabase()`
 * (`'title' => 'Borrowing overdue'`, …), and both the bell dropdown and
 * `/notifications` — open to all three roles — rendered those strings verbatim,
 * so an Arabic user got a list of English sentences inside Arabic chrome.
 *
 * `NotificationResource` sends `type` (the fully-qualified class name) and the
 * whole `data` payload, which is everything needed to render our own copy: the
 * two classes whose body interpolates runtime values also store those values
 * as separate keys (`failure_count`/`attempted_email`, `current_percent`).
 *
 * A type with no matching key falls back to the server's string, so a new
 * notification class ships readable rather than blank.
 */

/** `App\Notifications\BorrowingDueSoonNotification` → `borrowingDueSoon`. */
export function notificationTypeSlug(type: string): string {
  const base = type.split('\\').pop() ?? type
  const stripped = base.replace(/Notification$/, '')
  return stripped ? stripped.charAt(0).toLowerCase() + stripped.slice(1) : ''
}

/**
 * Named arguments for the two message bodies that carry runtime values.
 * Read defensively — `data` is untyped wire content.
 */
export function notificationBodyParams(data: Record<string, unknown>): Record<string, unknown> {
  const params: Record<string, unknown> = {}
  if (typeof data.failure_count === 'number') params.count = data.failure_count
  if (typeof data.attempted_email === 'string') params.email = data.attempted_email
  if (typeof data.current_percent === 'number') params.percent = data.current_percent
  return params
}
