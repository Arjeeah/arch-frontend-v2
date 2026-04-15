import axios from 'axios'
import { env } from '@/app/config/env'

export const http = axios.create({ baseURL: env.apiBaseUrl })
