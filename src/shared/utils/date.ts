/**
 * Formats an ISO date/datetime string from the API for display, e.g. "Dec 1, 2025".
 * Returns a dash for empty values and the raw string if it is not parseable.
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Converts an API date/datetime string to the `yyyy-mm-dd` an `<input type="date">` expects. */
export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Days from today until `value`. Negative when the date is in the past. */
export function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const msPerDay = 24 * 60 * 60 * 1000
  const startOfDay = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.round((startOfDay(date) - startOfDay(new Date())) / msPerDay)
}
