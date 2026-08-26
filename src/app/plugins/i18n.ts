import { createI18n, type PluralizationRule } from 'vue-i18n'
import en from '@/locales/en.json'
import ar from '@/locales/ar.json'

export const SUPPORTED_LOCALES = ['en', 'ar'] as const

export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

const LOCALE_KEY = 'app_locale'
const DEFAULT_LOCALE: AppLocale = 'en'

/** Locales that read right-to-left — drives `<html dir>`. */
const RTL_LOCALES: readonly AppLocale[] = ['ar']

export function isSupportedLocale(value: string | null): value is AppLocale {
  return value !== null && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

function readStoredLocale(): AppLocale {
  const stored = localStorage.getItem(LOCALE_KEY)
  return isSupportedLocale(stored) ? stored : DEFAULT_LOCALE
}

/**
 * Mirrors the locale onto `<html lang>` / `<html dir>`. Setting `dir` is what
 * flips every logical Tailwind utility (`ps-`/`pe-`/`ms-`/`me-`/`text-start`)
 * to the other side — components never branch on the locale themselves.
 */
function applyDocumentLocale(locale: AppLocale): void {
  document.documentElement.lang = locale
  document.documentElement.dir = RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr'
}

/**
 * CLDR's six Arabic plural categories, in the order every pluralized message
 * in `ar.json` lists its forms: `zero | one | two | few | many | other`.
 *
 * vue-i18n ships one built-in rule shaped for English-like languages — two or
 * three buckets keyed off `choice === 0 | 1 | 2+` — which is what every
 * Arabic message in this app was silently using before this rule existed.
 * That is why "2" rendered through the generic "many" bucket instead of the
 * dual form: Arabic needs six categories, not three, and the boundary between
 * "few" and "many" is `n % 100`, not `n` itself (e.g. 103 is "few" — three of
 * something — the same as 3 is).
 *
 * https://cldr.unicode.org/index/cldr-spec/plural-rules — locale `ar`.
 */
const arabicPluralRule: PluralizationRule = (choice, choicesLength, orgRule) => {
  // A message that was never converted to the 6-form syntax (still 1-3
  // forms, e.g. a future key nobody has expanded yet) has nothing to gain
  // from CLDR categories — `orgRule` is vue-i18n's own built-in rule, so
  // deferring to it reproduces exactly what that message would render as
  // under any other locale, instead of guessing at a 6-category index it
  // can't reach.
  if (choicesLength < 6) return orgRule ? orgRule(choice, choicesLength) : choice ? 1 : 0

  const n = Math.abs(choice)
  const mod100 = n % 100
  if (n === 0) return 0 // zero
  if (n === 1) return 1 // one
  if (n === 2) return 2 // two
  if (mod100 >= 3 && mod100 <= 10) return 3 // few:  3–10, 103–110, …
  if (mod100 >= 11 && mod100 <= 99) return 4 // many: 11–99, 111–199, …
  return 5 // other: 100, 101, 102, 200, 201, 202, …
}

const initialLocale = readStoredLocale()

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: DEFAULT_LOCALE,
  messages: { en, ar },
  pluralRules: { ar: arabicPluralRule },
})

// Boot: the stored choice has to reach the document before the first paint.
applyDocumentLocale(initialLocale)

/** The one way to change language: switches, persists and re-orients the page. */
export function setLocale(locale: AppLocale): void {
  i18n.global.locale.value = locale
  localStorage.setItem(LOCALE_KEY, locale)
  applyDocumentLocale(locale)
}
