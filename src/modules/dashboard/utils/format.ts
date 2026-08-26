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
 *
 * `ar`, not `ar-LY`. Both give Arabic wording, and `-u-nu-latn` forces Latin
 * digits on either — but the separators differ, and `ar-LY` picks the European
 * pair: it groups thousands with `.` and marks the decimal with `,`. The total
 * archive then reads "14.525" beside an English UI that says "14,525", and a
 * scan trend reads "-4,5%". With Latin digits already chosen for consistency
 * with the rest of the app, the Latin separators have to come with them.
 */
const LATIN_ARABIC = 'ar-u-nu-latn'

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
 * Wraps a value in Unicode isolates (FSI … PDI) so it survives an RTL line.
 *
 * The API sends storage sizes pre-formatted as `"1.3 TB"` — a number, a space,
 * then Latin letters. Dropped straight into an Arabic sentence that is exactly
 * the shape the bidi algorithm mangles: UAX#9 resolves the space between a
 * number and a letter to the paragraph level, which splits `1.3 TB` into two
 * runs and lays them out right-to-left, so the line reads **"TB 1.3"** — the
 * unit in front of its own number. Isolating the value keeps it one atomic
 * left-to-right run and leaves the surrounding Arabic untouched.
 *
 * FSI (not LRI) so a value that is ever localised to Arabic units still picks
 * its own direction. The characters are default-ignorable — they take no space
 * and render nothing, in the DOM and on a canvas alike.
 */
export function isolate(value: string): string {
  // Written as escapes on purpose — the literal characters are invisible, and
  // a future edit would silently drop them.
  return `\u2068${value}\u2069`
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
