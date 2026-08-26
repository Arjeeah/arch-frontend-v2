/**
 * A 0–100 value as a localised percentage, e.g. `92%`.
 *
 * One helper because the same confidence score was rendered three ways: the
 * pipeline monitor and the dashboard went through `Intl` (Latin `%`), the
 * review queue through an Arabic `٪`, and the two student-document screens
 * concatenated a raw literal with no formatting or bidi handling at all — so
 * one document read `92٪` on `/review` and `92%` on `/pipeline/monitor`.
 *
 * `numberingSystem` is pinned to `latn` for the same reason every other
 * formatter in this app pins it: the rest of the UI renders Western digits
 * under `ar`, and CLDR's default for `ar` has moved between releases.
 *
 * Values arrive on a 0–100 scale (`RefinementData::fromArray()` rescales the
 * model's 0.0–1.0 answer server-side), so they are divided by 100 before
 * `style: 'percent'` — otherwise `92` prints as `9,200%`.
 */
export function formatPercent(value: number | null | undefined, locale: string): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-'
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 0,
    numberingSystem: 'latn',
  }).format(value / 100)
}
