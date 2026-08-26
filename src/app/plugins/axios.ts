import axios, { type AxiosError } from 'axios'
import { env } from '@/app/config/env'
import { API_ENDPOINTS } from '@/app/config/api'
import { authStorage } from '@/app/config/authStorage'

/** Where an expired session lands. Must match the login route in the router. */
const LOGIN_PATH = '/login'

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

      if (window.location.pathname !== LOGIN_PATH) {
        // Carry where the user was, so signing back in returns them there
        // instead of dumping them on the dashboard. `LoginPage` reads this
        // query exactly as it reads the one the router guard builds.
        const from = window.location.pathname + window.location.search
        window.location.assign(`${LOGIN_PATH}?redirect=${encodeURIComponent(from)}`)
      } else {
        // Already on /login, so there is no reload to reset in-memory state.
        // Without this the store keeps reporting `isAuthenticated` against
        // storage we just emptied.
        clearAuthState()
      }
    }

    return Promise.reject(error)
  },
)
