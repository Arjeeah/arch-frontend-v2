/**
 * Number formatting for this module.
 *
 * `vue-i18n`'s `n()` is deliberately not used: it needs a `numberFormats` block
 * registered on the i18n instance, and `src/app/plugins/i18n.ts` is outside this
 * module's territory. `Intl` gives the same result with no shared-config edit.
 */

/**
 * The locale tag every `Intl` formatter in this module is given.
 *
 * Arabic is pinned to the Latin numbering system (`-u-nu-latn`) rather than the
 * Eastern Arabic digits `Intl` would otherwise pick. This is an operations
 * screen: it sits beside file numbers, UUIDs and page counts that are Latin
 * whatever the interface language, and mixing the two numeral systems in one
 * table makes the figures harder, not easier, to scan.
 *
 * Exported because the same rule has to reach the shared formatters this module
 * calls — `relativeTime()` takes a locale tag, and the "Added" column has to
 * agree with the Latin page counts and percentages in the very same row.
 * `shared/utils/date.ts` pins `latn` itself now as a backstop for the call sites
 * that have no module-local helper, so passing this through is belt-and-braces
 * rather than the only thing standing between the table and mixed numerals.
 */
export function intlLocale(locale: string): string {
  return locale === 'ar' ? 'ar-u-nu-latn' : locale
}

/** Thousands-separated integer, e.g. `1,204`. */
export function formatCount(value: number, locale: string): string {
  return new Intl.NumberFormat(intlLocale(locale)).format(value)
}

/**
 * A refinement confidence as a whole percentage.
 *
 * The wire value is **already on a 0–100 scale**: `RefinementData::fromArray()`
 * multiplies the model's 0.0–1.0 answer by 100 before it is stored, which is
 * why the backend's auto-classify threshold is `85` rather than `0.85`
 * (`config('ai.pipeline.confidence_threshold')`). Dividing by 100 here is what
 * makes `style: 'percent'` print `92%` instead of `9,200%`.
 *
 * Anything that is not a finite number — including the raw `"92.00"` string
 * Laravel's `decimal:2` cast puts on the wire, which the api mapper is
 * responsible for coercing — returns a dash rather than a nonsense figure.
 */
export function formatConfidence(value: number | null | undefined, locale: string): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-'
  return new Intl.NumberFormat(intlLocale(locale), {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(value / 100)
}

/** Human-readable file size for the upload screen's selection summary. */
export function formatBytes(bytes: number, locale: string): string {
  const formatter = new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 1 })
  if (bytes < 1024) return `${formatter.format(bytes)} B`
  if (bytes < 1024 * 1024) return `${formatter.format(bytes / 1024)} KB`
  return `${formatter.format(bytes / (1024 * 1024))} MB`
}
