/**
 * Number formatting for the dashboards.
 *
 * Every figure on these screens used to be a hard-coded string ("14,525"). Now
 * that the numbers are real they go through `Intl.NumberFormat`, so thousands
 * separators follow the active locale instead of being baked into the markup.
 *
 * Digits stay Latin in both languages: `Intl` would otherwise render Arabic
 * with Arabic-Indic digits (٤٥٦), which clashes with the file numbers, student
 * numbers and IDs shown next to them everywhere else in the app.
 */
const LATIN_ARABIC = 'ar-LY-u-nu-latn'

export function intlLocale(locale: string): string {
  return locale.startsWith('ar') ? LATIN_ARABIC : 'en-US'
}

/** Thousands-separated integer, e.g. `14,525`. */
export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 0 }).format(value)
}

/** Whole percentage from a 0–100 value, e.g. `62%`. */
export function formatPercent(value: number, locale: string): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(value / 100)
}

/**
 * Signed percentage for a change indicator, e.g. `+12.5%` / `-4%`.
 * `signDisplay: 'exceptZero'` keeps a flat day as plain `0%`.
 */
export function formatChangePercent(value: number, locale: string): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: 'percent',
    maximumFractionDigits: 1,
    signDisplay: 'exceptZero',
  }).format(value / 100)
}
