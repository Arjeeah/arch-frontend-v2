import { http } from '@/app/plugins/axios'
import type { ServerTableParams, ServerTableResponse } from '@/shared/composables/useServerTable'
import type { AppNotification, NotificationSeverity } from '../types'

/**
 * Endpoint prefix for this module. `notifications` postdates the shared
 * `API_ENDPOINTS` map in `src/app/config/api.ts` and that file is outside
 * this module's territory (see CLAUDE.md's per-module mapper rule) — every
 * module owns its own endpoint strings rather than reaching into `app/`.
 */
const NOTIFICATIONS_BASE = '/v1/notifications'

const KNOWN_SEVERITIES: readonly NotificationSeverity[] = ['info', 'success', 'warning', 'error']

function toSeverity(raw: unknown): NotificationSeverity {
  return typeof raw === 'string' && (KNOWN_SEVERITIES as readonly string[]).includes(raw)
    ? (raw as NotificationSeverity)
    : 'info'
}

/** A notification exactly as `NotificationResource::toArray()` sends it (snake_case). */
interface NotificationResource {
  id: string
  type: string
  title: string | null
  body: string | null
  action_url: string | null
  icon: string | null
  severity: string
  reference_id: string | null
  /**
   * The whole `toDatabase()` payload. `title`/`body` above are two of its keys;
   * the rest carry the runtime values the backend interpolated into `body`
   * (`failure_count`, `current_percent`, …), which is what lets the UI render
   * its own translated copy instead of the server's English sentence.
   */
  data?: Record<string, unknown> | null
  read_at: string | null
  created_at: string | null
}

/** `index` is paginated: `{ data: [...], links, meta }`. */
interface NotificationListResponse {
  data: NotificationResource[]
  meta: { current_page?: number; last_page?: number; total?: number }
}

/** `read` responses wrap the updated resource in a single `data` key. */
interface NotificationItemResponse {
  data: NotificationResource
}

interface UnreadCountResponse {
  data: { count: number }
}

/** snake_case wire format -> camelCase UI model. */
function fromResource(resource: NotificationResource): AppNotification {
  return {
    id: resource.id,
    type: resource.type,
    title: resource.title ?? '',
    body: resource.body ?? '',
    actionUrl: resource.action_url,
    icon: resource.icon,
    severity: toSeverity(resource.severity),
    referenceId: resource.reference_id,
    data: resource.data ?? {},
    readAt: resource.read_at,
    createdAt: resource.created_at,
  }
}

export const notificationsApi = {
  /**
   * Server-paginated list, shaped for `useServerTable`. `read` is an
   * optional filter merged in through `setFilters({ read: true|false })` —
   * `NotificationController::index` only applies it when the query key is
   * present (`$request->filled('read')`), so a missing/undefined value
   * correctly means "all".
   */
  list: async (params: ServerTableParams): Promise<ServerTableResponse<AppNotification>> => {
    const read = params.read
    const query: Record<string, unknown> = { page: params.page, per_page: params.per_page }
    if (typeof read === 'boolean') query.read = read

    const { data } = await http.get<NotificationListResponse>(NOTIFICATIONS_BASE, {
      params: query,
    })
    return {
      data: data.data.map(fromResource),
      meta: data.meta,
    }
  },

  unreadCount: async (): Promise<number> => {
    const { data } = await http.get<UnreadCountResponse>(`${NOTIFICATIONS_BASE}/unread-count`)
    return data.data.count
  },

  markRead: async (id: string): Promise<AppNotification> => {
    const { data } = await http.post<NotificationItemResponse>(`${NOTIFICATIONS_BASE}/${id}/read`)
    return fromResource(data.data)
  },

  markAllRead: async (): Promise<void> => {
    await http.post(`${NOTIFICATIONS_BASE}/read-all`)
  },

  remove: async (id: string): Promise<void> => {
    await http.delete(`${NOTIFICATIONS_BASE}/${id}`)
  },
}
