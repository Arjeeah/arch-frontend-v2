import { http } from '@/app/plugins/axios'
import { API_ENDPOINTS } from '@/app/config/api'
import type { LoginCredentials, LoginResponse } from '../types'

export const AuthService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const { data } = await http.post<LoginResponse>(API_ENDPOINTS.auth.login, credentials)
    return data
  },
}
