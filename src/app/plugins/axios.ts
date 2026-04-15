import axios from 'axios'
import { env } from '@/app/config/env'

export const http = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15_000,
})

http.interceptors.request.use(config => {
  const token = localStorage.getItem('auth_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
