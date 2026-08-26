import { defineStore } from 'pinia'
import { authStorage } from '@/app/config/authStorage'
import { readSessionRole } from '@/app/config/sessionRole'
import { i18n } from '@/app/plugins/i18n'
import { AuthService } from '../services/authService'
import type { AuthUser, LoginCredentials, UserRole } from '../types'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: authStorage.getToken(),
    user: authStorage.getUser(),
    loading: false,
    error: null as string | null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    currentUser: (state): AuthUser | null => state.user,
    /**
     * Falls back to `readSessionRole()` so the sidebar cannot disagree with the
     * router guard. `AuthService.fromResource` always persists a scalar `role`,
     * so the fallback is unreachable on the normal login path — it exists for a
     * stored session that still carries the wire's `roles` array, which
     * `readSessionRole()` reduces by precedence and this getter cannot.
     */
    role: (state): UserRole | null => state.user?.role ?? readSessionRole(),
    userName: (state): string | null => state.user?.name ?? null,
  },

  actions: {
    async login(credentials: LoginCredentials): Promise<{ success: boolean }> {
      this.loading = true
      this.error = null
      try {
        const { token, user } = await AuthService.login(credentials)
        this.token = token
        this.user = user
        authStorage.setSession(token, user)
        return { success: true }
      } catch (err) {
        const axiosErr = err as { response?: { data?: { message?: string } } }
        this.error = axiosErr?.response?.data?.message ?? i18n.global.t('login.errors.failed')
        return { success: false }
      } finally {
        this.loading = false
      }
    },

    async logout(): Promise<void> {
      try {
        await AuthService.logout()
      } catch {
        // ignore errors — always clear local state
      } finally {
        this.clearSession()
      }
    },

    /** Drops the session locally, without calling the API. */
    clearSession(): void {
      this.token = null
      this.user = null
      authStorage.clear()
    },

    /**
     * Restores the session `main.ts` boots with.
     *
     * This used to `await AuthService.me()`. Verified against the running API:
     * `GET /v1/me` is not registered in `routes/api/v1.php` and answers
     * `404 {"message":"The route api/v1/me could not be found."}` — for every
     * role, on every load. The 404 was swallowed (only a 401 cleared the
     * session), so boot always fell back to the stored user anyway; all the
     * request bought was one blocking round-trip in front of `app.mount()` and
     * the app's only console error.
     *
     * Rehydrating from `authStorage` is therefore what the app has effectively
     * been doing all along, minus the failed request. `AuthService.me()` is
     * kept, and stays correct for the `{ data: UserResource }` envelope: when
     * the route is registered, restore the `await` here and nothing else
     * changes. A revoked token is still caught — the first real request of the
     * session 401s and the axios interceptor clears and redirects.
     */
    init(): void {
      if (!this.token) return
      this.user = authStorage.getUser()
    },

    clearError() {
      this.error = null
    },
  },
})
