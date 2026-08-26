/**
 * The UI locale, read off `<html lang>`.
 *
 * `setLocale()` in `src/app/plugins/i18n.ts` sets that attribute on every
 * switch, and this module may not import `src/app/` (boundaries rule), so the
 * DOM is the shared channel. Falls back to `en` outside a browser or before the
 * plugin has run. Keeping it a lookup rather than a parameter means every
 * existing `formatDate(x)` call site follows the language with no edit — there
 * are dozens across ten modules, and a date rendered `en-US` under an Arabic UI
 * was reported by half of them.
 */
function uiLocale(): string {
  if (typeof document === 'undefined') return 'en'
  return document.documentElement.lang || 'en'
}

/**
 * Pins a locale tag to the Latin numbering system (`-u-nu-latn`).
 *
 * Every other formatter in this app pins its numbering system explicitly —
 * `shared/utils/percent.ts`, `modules/pipeline/format.ts`, `modules/dashboard/
 * utils/format.ts` — because the UI renders Western digits under `ar` and
 * CLDR's default for `ar` has moved between releases. `Intl.RelativeTimeFormat`
 * takes the setting through the locale tag rather than the options bag, which
 * is why this is a string rewrite and not `{ numberingSystem: 'latn' }`.
 *
 * Idempotent: a caller that already passes `ar-u-nu-latn` (the pipeline and
 * dashboard tables do, via their own `intlLocale()`) is left alone.
 */
function latnLocale(locale: string): string {
  if (!locale.startsWith('ar')) return locale
  return locale.includes('-nu-') ? locale : `${locale}-u-nu-latn`
}

/**
 * Formats an ISO date/datetime string from the API for display, e.g. "Dec 1, 2025".
 * Returns a dash for empty values and the raw string if it is not parseable.
 *
 * Formats in the active UI locale unless one is passed explicitly.
 */
export function formatDate(value: string | null | undefined, locale?: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(latnLocale(locale ?? uiLocale()), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Date **and** time, e.g. "Dec 1, 2025, 14:32" — for logs, where the day alone
 * is not enough to tell two entries apart.
 *
 * Same contract as `formatDate`: a dash for empty values, the raw string when
 * it is not parseable, and the active UI locale unless one is passed.
 */
export function formatDateTime(value: string | null | undefined, locale?: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(latnLocale(locale ?? uiLocale()), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Converts an API date/datetime string to the `yyyy-mm-dd` an `<input type="date">` expects.
 *
 * CAVEAT — timezone. Every function in this file reads the instant through the
 * viewer's local calendar (`getFullYear`/`getMonth`/`getDate`), which keeps the
 * picker and `formatDate` showing the same day as each other. It does mean the
 * day can differ from the one the server stored.
 *
 * What the live API actually sends was checked rather than assumed: **no
 * endpoint emits a bare `yyyy-mm-dd` or a zone-less `Y-m-d H:i:s`.** Every
 * timestamp across students, borrowings, documents, audit, notifications,
 * dashboards, reports and settings is a full ISO instant with `Z` — including
 * `due_date`, which is `2026-09-09T11:41:56.000000Z`, not a date. So the
 * classic "date-only string parses as UTC midnight" trap is not reachable here.
 *
 * The one shape that does land on the boundary is a date this picker itself
 * produced: `PUT /v1/student-documents/{id}` with `submitted_at: "2026-08-26"`
 * stores and returns `2026-08-26T00:00:00.000000Z` (verified live). At UTC+2 —
 * the deployment timezone — that renders back as 26 August and round-trips
 * cleanly. West of UTC it would render as the 25th and walk backwards one day
 * per save. Fixing that means deciding whether such a value is an instant or a
 * calendar day, which is a backend question (the column is a datetime); do not
 * "fix" it by making one function here UTC-based, because that would only make
 * the picker and the table disagree.
 */
export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Units ordered from largest to smallest, with the number of seconds each one holds. */
const RELATIVE_UNITS: ReadonlyArray<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 60 * 60 * 24 * 365],
  ['month', 60 * 60 * 24 * 30],
  ['week', 60 * 60 * 24 * 7],
  ['day', 60 * 60 * 24],
  ['hour', 60 * 60],
  ['minute', 60],
  ['second', 1],
]

/**
 * Human-readable distance from now, e.g. "3 hours ago" / "in 2 days".
 * Uses `Intl.RelativeTimeFormat` — no date library needed.
 *
 * Returns a dash for empty values and the raw string if it is not parseable,
 * matching `formatDate` above.
 */
export function relativeTime(value: string | null | undefined, locale?: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000)
  const formatter = new Intl.RelativeTimeFormat(latnLocale(locale ?? uiLocale()), {
    numeric: 'auto',
  })

  for (const [unit, secondsInUnit] of RELATIVE_UNITS) {
    if (Math.abs(diffSeconds) >= secondsInUnit || unit === 'second') {
      return formatter.format(Math.trunc(diffSeconds / secondsInUnit), unit)
    }
  }
  return formatter.format(0, 'second')
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
