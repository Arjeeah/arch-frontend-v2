import { http } from '@/app/plugins/axios'
import { API_ENDPOINTS } from '@/app/config/api'
import type { LoginCredentials, LoginResponse, AuthUser } from '../types'

export const AuthService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const { data } = await http.post<LoginResponse>(API_ENDPOINTS.auth.login, credentials)
    return data
  },

  async logout(): Promise<void> {
    await http.post(API_ENDPOINTS.auth.logout)
  },

  async me(): Promise<AuthUser> {
    const { data } = await http.get<{ user: AuthUser }>(API_ENDPOINTS.auth.me)
    return data.user
  },
}
