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
        window.location.assign(LOGIN_PATH)
      }
    }

    return Promise.reject(error)
  },
)
