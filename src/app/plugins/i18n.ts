import { createI18n } from 'vue-i18n'
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

const initialLocale = readStoredLocale()

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: DEFAULT_LOCALE,
  messages: { en, ar },
})

// Boot: the stored choice has to reach the document before the first paint.
applyDocumentLocale(initialLocale)

/** The one way to change language: switches, persists and re-orients the page. */
export function setLocale(locale: AppLocale): void {
  i18n.global.locale.value = locale
  localStorage.setItem(LOCALE_KEY, locale)
  applyDocumentLocale(locale)
}
