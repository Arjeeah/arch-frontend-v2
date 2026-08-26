import { http } from '@/app/plugins/axios'
import type {
  ServerTableParams,
  ServerTableMeta,
  ServerTableResponse,
} from '@/shared/composables/useServerTable'
import type { LocationStatus, Room, RoomInput } from '../types'

/** `/v1/location/rooms` — see Admin/Location/RoomController.php. */
const BASE_PATH = '/v1/location/rooms'

/** A room exactly as `RoomResource` sends it. */
interface RoomResource {
  id: string
  name: string
  description: string | null
  /**
   * A JSON column cast to `array` by `Room::$casts`, so this arrives decoded —
   * an object/array, never the `string` that `Room{Store,Update}Request`
   * validates. Typed `unknown` because it is genuinely untyped on the wire, and
   * never mapped onto the UI model: this module does not render room layouts,
   * and echoing a decoded value back would fail the request's `string` rule.
   */
  canvas_data?: unknown
  status: string
  cabinets?: unknown[]
  created_at: string
  updated_at: string
}

/** `show` / `store` / `update` responses are wrapped in a single `data` key. */
interface RoomItemResponse {
  data: RoomResource
}

/** `index` is Laravel-paginated: `{ data: [...], meta }`. */
interface RoomListResponse {
  data: RoomResource[]
  meta: ServerTableMeta
}

// verify against live API: Status::class casts to the enum's string value
// ('active' | 'inactive'), so the wire value should already be lowercase.
// Narrowed defensively rather than trusted as-is.
function toStatus(raw: string): LocationStatus {
  return raw === 'inactive' ? 'inactive' : 'active'
}

/** snake_case wire format -> camelCase UI model. */
function fromResource(resource: RoomResource): Room {
  return {
    id: resource.id,
    name: resource.name,
    description: resource.description,
    status: toStatus(resource.status),
    cabinetsCount: resource.cabinets?.length ?? 0,
    createdAt: resource.created_at,
    updatedAt: resource.updated_at,
  }
}

/**
 * camelCase UI model -> snake_case request payload.
 *
 * `canvas_data` is never sent: see the `RoomResource` note above. Both requests
 * treat it as optional (`nullable` on store, `sometimes` on update), so leaving
 * it out is safe and preserves whatever is already stored.
 */
function toPayload(input: Partial<RoomInput>): Record<string, string | null> {
  const payload: Record<string, string | null> = {}
  if (input.name !== undefined) payload.name = input.name
  if (input.description !== undefined) payload.description = input.description
  if (input.status !== undefined) payload.status = input.status
  return payload
}

/** Filters the rooms browse page exposes, merged in by `useServerTable`. */
export interface RoomListParams extends ServerTableParams {
  name?: string
  status?: LocationStatus | ''
}

export const roomsApi = {
  /**
   * One page of rooms. Shaped to plug straight into `useServerTable`'s
   * fetcher contract.
   *
   * The backend (Spatie Query Builder) only reads filters nested under a
   * `filter` query key (`?filter[name]=x`, not `?name=x`) — see
   * `config/query-builder.php` in the backend repo. `useServerTable` hands
   * this function flat filter fields, so the nesting happens here, not at
   * the call site.
   */
  list: async (params: RoomListParams): Promise<ServerTableResponse<Room>> => {
    const { page, per_page, name, status } = params
    const filter: Record<string, string> = {}
    if (name) filter.name = name
    if (status) filter.status = status

    const { data } = await http.get<RoomListResponse>(BASE_PATH, {
      params: { filter, page, per_page },
    })
    return { data: data.data.map(fromResource), meta: data.meta }
  },

  show: async (id: string): Promise<Room> => {
    const { data } = await http.get<RoomItemResponse>(`${BASE_PATH}/${id}`)
    return fromResource(data.data)
  },

  create: async (input: RoomInput): Promise<Room> => {
    const { data } = await http.post<RoomItemResponse>(BASE_PATH, toPayload(input))
    return fromResource(data.data)
  },

  update: async (id: string, input: Partial<RoomInput>): Promise<Room> => {
    const { data } = await http.put<RoomItemResponse>(`${BASE_PATH}/${id}`, toPayload(input))
    return fromResource(data.data)
  },

  /** Cascades server-side: deletes the room's cabinets and their drawers too. */
  remove: async (id: string): Promise<void> => {
    await http.delete(`${BASE_PATH}/${id}`)
  },
}
