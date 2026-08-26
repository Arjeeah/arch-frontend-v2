/// <reference types="vite/client" />

/**
 * Every `VITE_*` variable the app reads. Declaring them here is what makes
 * `import.meta.env.VITE_…` type-checked instead of `any`.
 */
interface ImportMetaEnv {
  /** Base URL of the ARCH API, including the `/api` prefix. See `.env.example`. */
  readonly VITE_API_BASE_URL?: string
}
