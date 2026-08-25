import { http } from '@/app/plugins/axios'
import type { AuditLog, AuditStat, TimelineEntry } from '../types'

/**
 * Wire shapes for the audit endpoints.
 *
 * The backend is Laravel and speaks snake_case, exactly like every other
 * endpoint in this app (`users`, `faculties`, `borrowings`). Before this file
 * had these types the store assigned raw responses straight onto camelCase
 * models, so `userName`, `targetEntity`, `referenceId` and friends were all
 * `undefined` and the page rendered blanks behind its `?? '-'` fallbacks.
 *
 * verify against live API: field names below are the snake_case spelling of
 * the model properties the page renders. Adjust here — not in the components —
 * if the backend names something differently.
 */
interface AuditStatResource {
  total_operations_today: number
  operations_change: string
  users_logged_in: number
  total_users: number
}

interface TimelineEntryResource {
  id: number
  action: string
  user_name: string
  user_role: string
  timestamp: string
}

interface AuditLogResource {
  id: number
  timestamp: string
  user_name: string
  user_role: string
  action: string
  target_entity: string
  reference_id: string
}

/** `stats` is returned bare; the list endpoints wrap rows in `data`. */
interface TimelineResponse {
  data?: TimelineEntryResource[]
}

interface AuditLogListResponse {
  data: AuditLogResource[]
  meta?: { last_page?: number }
}

export interface AuditLogQuery {
  search?: string
  role?: string
  page?: number
  order?: string
}

/** Rows fetched for one page of the log table, plus the page count. */
export interface AuditLogPage {
  logs: AuditLog[]
  totalPages: number
}

function statFromResource(resource: AuditStatResource): AuditStat {
  return {
    totalOperationsToday: resource.total_operations_today,
    operationsChange: resource.operations_change,
    usersLoggedIn: resource.users_logged_in,
    totalUsers: resource.total_users,
  }
}

function timelineEntryFromResource(resource: TimelineEntryResource): TimelineEntry {
  return {
    id: resource.id,
    action: resource.action,
    userName: resource.user_name,
    userRole: resource.user_role,
    timestamp: resource.timestamp,
  }
}

function logFromResource(resource: AuditLogResource): AuditLog {
  return {
    id: resource.id,
    timestamp: resource.timestamp,
    userName: resource.user_name,
    userRole: resource.user_role,
    action: resource.action,
    targetEntity: resource.target_entity,
    referenceId: resource.reference_id,
  }
}

export const auditApi = {
  getStats: async (): Promise<AuditStat> => {
    const { data } = await http.get<AuditStatResource>('/v1/audit-logs/stats')
    return statFromResource(data)
  },

  getTimeline: async (): Promise<TimelineEntry[]> => {
    // The endpoint has been seen both wrapped in `data` and returned bare, so
    // accept either rather than silently rendering an empty timeline.
    const { data } = await http.get<TimelineResponse | TimelineEntryResource[]>(
      '/v1/audit-logs/timeline',
    )
    const rows = Array.isArray(data) ? data : (data.data ?? [])
    return rows.map(timelineEntryFromResource)
  },

  getLogs: async (params: AuditLogQuery): Promise<AuditLogPage> => {
    const { data } = await http.get<AuditLogListResponse>('/v1/audit-logs', { params })
    return {
      logs: data.data.map(logFromResource),
      totalPages: data.meta?.last_page ?? 1,
    }
  },

  exportReport: () => http.get<Blob>('/v1/audit-logs/export', { responseType: 'blob' }),
}
