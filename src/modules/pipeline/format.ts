/**
 * Number formatting for this module.
 *
 * `vue-i18n`'s `n()` is deliberately not used: it needs a `numberFormats` block
 * registered on the i18n instance, and `src/app/plugins/i18n.ts` is outside this
 * module's territory. `Intl` gives the same result with no shared-config edit.
 */

/**
 * The locale tag numbers are formatted with.
 *
 * Arabic is pinned to the Latin numbering system (`-u-nu-latn`) rather than the
 * Eastern Arabic digits `Intl` would otherwise pick. This is an operations
 * screen: it sits beside file numbers, UUIDs and page counts that are Latin
 * whatever the interface language, and mixing the two numeral systems in one
 * table makes the figures harder, not easier, to scan.
 */
function numberLocale(locale: string): string {
  return locale === 'ar' ? 'ar-u-nu-latn' : locale
}

/** Thousands-separated integer, e.g. `1,204`. */
export function formatCount(value: number, locale: string): string {
  return new Intl.NumberFormat(numberLocale(locale)).format(value)
}

/**
 * A 0–1 confidence score as a whole percentage. Returns a dash for a document
 * that has not been refined yet, matching `formatDate`'s treatment of nulls.
 */
export function formatConfidence(value: number | null | undefined, locale: string): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-'
  return new Intl.NumberFormat(numberLocale(locale), {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(value)
}

/** Human-readable file size for the upload screen's selection summary. */
export function formatBytes(bytes: number, locale: string): string {
  const formatter = new Intl.NumberFormat(numberLocale(locale), { maximumFractionDigits: 1 })
  if (bytes < 1024) return `${formatter.format(bytes)} B`
  if (bytes < 1024 * 1024) return `${formatter.format(bytes / 1024)} KB`
  return `${formatter.format(bytes / (1024 * 1024))} MB`
}
