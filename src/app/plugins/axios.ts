import axios, { type AxiosError } from 'axios'
import { env } from '@/app/config/env'
import { API_ENDPOINTS } from '@/app/config/api'
import { authStorage } from '@/app/config/authStorage'

/**
 * Where an expired session lands, written the way the ROUTER writes paths —
 * without the deployment base. Must match the login route in the router.
 */
const LOGIN_PATH = '/login'

/**
 * The base the SPA is mounted under, minus its trailing slash: `/app` in a
 * deployed build (`vite build --base=/app/`), `''` in dev and in any build
 * served from the origin root.
 *
 * The router gets the same value through `createWebHistory(BASE_URL)`, so it
 * strips the base from every path it reports and re-adds it to every path it
 * navigates to. `window.location` does neither, so anything reading it has to
 * convert by hand. Mixing the two spaces is what this file used to do, and
 * behind `/app/` it went wrong three ways at once: an "am I already on the
 * login page?" guard that could never match (`/app/login` !== `/login`), so the
 * page reload-looped; a redirect to `/login`, which is outside the mount and
 * hits the Laravel vhost's 404; and a `redirect` query carrying the base, which
 * `LoginPage` then handed to `router.push` as `/app/app/students/1`.
 */
const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '')

/** `window.location.pathname` translated into router space (base removed). */
function currentRouterPath(): string {
  const { pathname } = window.location
  if (!BASE) return pathname
  if (pathname === BASE) return '/'
  return pathname.startsWith(`${BASE}/`) ? pathname.slice(BASE.length) : pathname
}

export const http = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15_000,
})

http.interceptors.request.use((config) => {
  const token = authStorage.getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/**
 * Clears the Pinia auth store as well as storage.
 *
 * Imported lazily: `useAuthStore` reaches `authService`, which imports this
 * module, so a static import would close a cycle at module-eval time. The
 * store is only ever needed once a request has already failed, long after the
 * app is set up.
 */
function clearAuthState(): void {
  void import('@/modules/auth/store/useAuthStore').then(({ useAuthStore }) => {
    useAuthStore().clearSession()
  })
}

/**
 * Global 401 handling: a rejected token means the session is gone, so wipe it
 * and send the browser to the login page. Two guards keep it from looping —
 * the login request itself reports bad credentials through the form instead,
 * and we never redirect when the login page is already showing.
 */
http.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const isLoginRequest = (error.config?.url ?? '').includes(API_ENDPOINTS.auth.login)

    if (error.response?.status === 401 && !isLoginRequest) {
      authStorage.clear()

      const here = currentRouterPath()

      if (here !== LOGIN_PATH) {
        // Carry where the user was, so signing back in returns them there
        // instead of dumping them on the dashboard. `LoginPage` reads this
        // query exactly as it reads the one the router guard builds, and the
        // guard builds it from `to.fullPath` — base-relative — so this value
        // has to be base-relative too or `router.push` doubles the base.
        const from = here + window.location.search
        // A whole-document navigation rather than `router.push`: reloading is
        // the cheapest way to drop every scrap of in-memory state belonging to
        // the dead session. It leaves router space, so the base goes back on.
        window.location.assign(`${BASE}${LOGIN_PATH}?redirect=${encodeURIComponent(from)}`)
      } else {
        // Already on the login page, so there is no reload to reset in-memory
        // state. Without this the store keeps reporting `isAuthenticated`
        // against storage we just emptied.
        clearAuthState()
      }
    }

    return Promise.reject(error)
  },
)
