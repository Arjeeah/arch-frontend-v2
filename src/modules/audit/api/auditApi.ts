import { http } from '@/app/plugins/axios'
import type { ServerTableResponse } from '@/shared/composables/useServerTable'
import type { AuditLog, AuditStat, TimelineEntry } from '../types'

/**
 * Wire shapes for the audit endpoints, read off the backend rather than
 * guessed: `app/Http/Resources/AuditLogResource.php` and
 * `AuditLogController::{index,stats,timeline,export}`.
 *
 * The previous version of this file invented `user_name`, `user_role`,
 * `operations_change`, `users_logged_in` and `total_users` — none of which the
 * API has ever sent — and read `stats` off the envelope instead of out of it.
 * Every stat card and both name columns rendered blank as a result.
 */

/**
 * `AuditLogController::stats()` returns `ApiResponse::success($stats)`, i.e.
 * `{ data: {...} }`. `security_alerts_count` is added for super_admin only.
 */
interface AuditStatResource {
  total_operations_today?: number
  total_documents?: number
  total_borrowings_today?: number
  security_alerts_count?: number
}

/**
 * `AuditLogResource`. `user` is a nested object (eager-loaded `user:id,name`),
 * and the role snapshot is the flat `role` key — it can also be `system` or
 * `unknown` for entries no signed-in user made. Both keys are omitted entirely
 * for a faculty-staff viewer.
 */
interface AuditLogResource {
  id: number
  timestamp: string | null
  action: string
  action_label?: string | null
  target_entity?: string | null
  reference_id?: string | null
  user?: { id: string; name: string | null } | null
  role?: string | null
}

interface StatsResponse {
  data?: AuditStatResource
}

interface AuditLogListResponse {
  data: AuditLogResource[]
  meta?: { current_page?: number; last_page?: number; total?: number }
}

/**
 * Exactly the keys `IndexAuditLogRequest` allows. Anything else is either
 * ignored (`validated()` drops it) or, for `role`, a 422 — which is what
 * `search`, `order` and an empty-string `role` used to trigger on every load.
 *
 * Every value must be `undefined` rather than `''` when unset: Laravel's
 * global `ConvertEmptyStringsToNull` turns `''` into `null`, and `sometimes`
 * only skips an *absent* key, so `role=''` fails the `string` rule.
 */
export interface AuditLogQuery extends Record<string, unknown> {
  role?: string
  action?: string
  user_id?: string
  reference_id?: string
  date_from?: string
  date_to?: string
  /** The only sort the endpoint supports: `created_at` asc or desc. */
  sort?: 'asc' | 'desc'
  page?: number
  per_page?: number
}

function statFromResource(resource: AuditStatResource): AuditStat {
  return {
    totalOperationsToday: resource.total_operations_today ?? null,
    totalDocuments: resource.total_documents ?? null,
    totalBorrowingsToday: resource.total_borrowings_today ?? null,
    securityAlertsCount: resource.security_alerts_count ?? null,
  }
}

function logFromResource(resource: AuditLogResource): AuditLog {
  return {
    id: resource.id,
    timestamp: resource.timestamp ?? null,
    userName: resource.user?.name ?? null,
    userRole: resource.role ?? null,
    action: resource.action,
    actionLabel: resource.action_label ?? null,
    targetEntity: resource.target_entity ?? null,
    referenceId: resource.reference_id ?? null,
  }
}

export const auditApi = {
  getStats: async (): Promise<AuditStat> => {
    const { data } = await http.get<StatsResponse>('/v1/audit-logs/stats')
    return statFromResource(data.data ?? {})
  },

  /**
   * `AuditLogPolicy::viewTimeline` is super_admin only — call it behind a role
   * check, or an archivist takes a 403 on every visit.
   */
  getTimeline: async (limit = 20): Promise<TimelineEntry[]> => {
    const { data } = await http.get<AuditLogListResponse>('/v1/audit-logs/timeline', {
      params: { limit },
    })
    return (data.data ?? []).map(logFromResource)
  },

  /** Shaped for `useServerTable`: `{ data, meta }` straight through. */
  getLogs: async (params: AuditLogQuery): Promise<ServerTableResponse<AuditLog>> => {
    const { data } = await http.get<AuditLogListResponse>('/v1/audit-logs', { params })
    return { data: (data.data ?? []).map(logFromResource), meta: data.meta ?? {} }
  },

  /** Streamed CSV; the export endpoint takes the same filters as the list. */
  exportReport: (params: AuditLogQuery = {}) =>
    http.get<Blob>('/v1/audit-logs/export', { params, responseType: 'blob' }),
}
