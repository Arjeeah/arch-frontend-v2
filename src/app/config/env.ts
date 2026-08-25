/**
 * Runtime configuration, read once from Vite's env.
 *
 * `VITE_API_BASE_URL` is the only knob — copy `.env.example` to `.env.local`
 * (gitignored) to point the app at another backend. The fallback is the shared
 * staging server; it is HTTPS-only, because a browser on an HTTPS page refuses
 * plain-HTTP XHR. Never reintroduce a bare-IP HTTP default here.
 */
export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'https://arch-os-server.tailf7bd4c.ts.net/api',
} as const
