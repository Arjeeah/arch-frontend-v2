import { defineStore } from 'pinia'
import { AuthService } from '../services/authService'
import type { AuthUser, LoginCredentials } from '../types'

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) as string | null,
    user: ((): AuthUser | null => {
      try {
        const raw = localStorage.getItem(USER_KEY)
        return raw ? (JSON.parse(raw) as AuthUser) : null
      } catch {
        return null
      }
    })(),
    loading: false,
    error: null as string | null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    currentUser: (state) => state.user,
  },

  actions: {
    async login(credentials: LoginCredentials): Promise<{ success: boolean }> {
      this.loading = true
      this.error = null
      try {
        const { token, user } = await AuthService.login(credentials)
        this.token = token
        this.user = user
        localStorage.setItem(TOKEN_KEY, token)
        localStorage.setItem(USER_KEY, JSON.stringify(user))
        return { success: true }
      } catch (err) {
        const axiosErr = err as { response?: { data?: { message?: string } } }
        this.error = axiosErr?.response?.data?.message ?? 'Login failed'
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
        this.token = null
        this.user = null
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
      }
    },

    async init(): Promise<void> {
      if (!this.token) return
      try {
        const user = await AuthService.me()
        this.user = user
        localStorage.setItem(USER_KEY, JSON.stringify(user))
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status === 401) {
          // Token is expired/invalid — clear everything and redirect to login
          await this.logout()
        }
        // Network error or 5xx → keep the token, user stays logged in
      }
    },

    clearError() {
      this.error = null
    },
  },
})
