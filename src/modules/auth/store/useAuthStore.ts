import { defineStore } from 'pinia'
import { authStorage } from '@/app/config/authStorage'
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
    role: (state): UserRole | null => state.user?.role ?? null,
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

    async init(): Promise<void> {
      if (!this.token) return
      try {
        const user = await AuthService.me()
        this.user = user
        authStorage.setUser(user)
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response?.status
        // 401 → the axios response interceptor already redirected; just make
        // sure the in-memory state matches the cleared storage.
        // Network error or 5xx → keep the token, user stays logged in.
        if (status === 401) this.clearSession()
      }
    },

    clearError() {
      this.error = null
    },
  },
})
