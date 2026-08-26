import type { AuthUser } from '@/modules/auth/types'

/**
 * The single place that reads or writes the persisted session.
 *
 * The auth store, the axios interceptors and the router guard all go through
 * this module — never touch `localStorage` for auth data anywhere else, or the
 * key names drift apart again.
 */
const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

export const authStorage = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  },

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token)
  },

  /** Returns `null` when nothing is stored or the stored JSON is corrupt. */
  getUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as AuthUser
    } catch {
      return null
    }
  },

  setUser(user: AuthUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },

  /** Persists a whole session at once (used right after a successful login). */
  setSession(token: string, user: AuthUser): void {
    this.setToken(token)
    this.setUser(user)
  },

  clear(): void {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },
}
