/**
 * Runtime configuration, read once from Vite's env.
 *
 * `VITE_API_BASE_URL` is the only knob — copy `.env.example` to `.env.local`
 * (gitignored) to point the app at another backend. The fallback is the shared
 * staging server; it is HTTPS-only, because a browser on an HTTPS page refuses
 * plain-HTTP XHR. Never reintroduce a bare-IP HTTP default here.
 *
 * `||`, not `??`: `.env.example` invites blanking the value ("leave unset to
 * use the staging default"), and a blank line in a `.env` file yields `''`,
 * not `undefined`. With `??` that empty string wins, axios gets `baseURL: ''`,
 * and every request silently hits the dev server's own origin instead.
 */
export const env = {
  apiBaseUrl:
    import.meta.env.VITE_API_BASE_URL?.trim() || 'https://arch-os-server.tailf7bd4c.ts.net/api',
} as const
