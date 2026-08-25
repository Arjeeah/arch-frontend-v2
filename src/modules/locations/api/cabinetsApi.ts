import { http } from '@/app/plugins/axios'
import type {
  ServerTableParams,
  ServerTableMeta,
  ServerTableResponse,
} from '@/shared/composables/useServerTable'
import type { Cabinet, CabinetInput, LocationStatus } from '../types'

/** `/v1/location/cabinets` — see Admin/Location/CabinetController.php. */
const BASE_PATH = '/v1/location/cabinets'

/** A cabinet exactly as `CabinetResource` sends it (note the capitalised `Room` key). */
interface CabinetResource {
  id: string
  Room: string
  name: string
  position_x: number
  position_y: number
  status: string
  drawers?: unknown[]
  created_at: string
  updated_at: string
}

interface CabinetItemResponse {
  data: CabinetResource
}

interface CabinetListResponse {
  data: CabinetResource[]
  meta: ServerTableMeta
}

// verify against live API: same shape as Status::class elsewhere in this module.
function toStatus(raw: string): LocationStatus {
  return raw === 'inactive' ? 'inactive' : 'active'
}

function fromResource(resource: CabinetResource): Cabinet {
  return {
    id: resource.id,
    name: resource.name,
    roomName: resource.Room,
    positionX: Number(resource.position_x),
    positionY: Number(resource.position_y),
    status: toStatus(resource.status),
    drawersCount: resource.drawers?.length ?? 0,
    createdAt: resource.created_at,
    updatedAt: resource.updated_at,
  }
}

function toPayload(input: Partial<CabinetInput>): Record<string, string | number> {
  const payload: Record<string, string | number> = {}
  if (input.name !== undefined) payload.name = input.name
  if (input.positionX !== undefined) payload.position_x = input.positionX
  if (input.positionY !== undefined) payload.position_y = input.positionY
  if (input.status !== undefined) payload.status = input.status
  return payload
}

/** Filters the cabinets browse page exposes. `roomId` is always set — this page only ever browses one room's cabinets. */
export interface CabinetListParams extends ServerTableParams {
  roomId: string
  name?: string
  status?: LocationStatus | ''
}

export const cabinetsApi = {
  /** One page of a room's cabinets. See `roomsApi.list` for the `filter[...]` nesting note. */
  list: async (params: CabinetListParams): Promise<ServerTableResponse<Cabinet>> => {
    const { page, per_page, roomId, name, status } = params
    const filter: Record<string, string> = { room_id: roomId }
    if (name) filter.name = name
    if (status) filter.status = status

    const { data } = await http.get<CabinetListResponse>(BASE_PATH, {
      params: { filter, page, per_page },
    })
    return { data: data.data.map(fromResource), meta: data.meta }
  },

  show: async (id: string): Promise<Cabinet> => {
    const { data } = await http.get<CabinetItemResponse>(`${BASE_PATH}/${id}`)
    return fromResource(data.data)
  },

  /**
   * `room_id` is required by `CabinetStoreRequest` but is never surfaced as a
   * form field — the caller always creates a cabinet from inside a room's
   * cabinet list, so the id comes from the route, not user input. The
   * backend auto-creates the cabinet's 4 drawers (`Cabinet::DRAWER_COUNT`).
   */
  create: async (roomId: string, input: CabinetInput): Promise<Cabinet> => {
    const { data } = await http.post<CabinetItemResponse>(BASE_PATH, {
      room_id: roomId,
      ...toPayload(input),
    })
    return fromResource(data.data)
  },

  /** Never sends `room_id` — the backend 422s an update that tries to change it. */
  update: async (id: string, input: Partial<CabinetInput>): Promise<Cabinet> => {
    const { data } = await http.put<CabinetItemResponse>(`${BASE_PATH}/${id}`, toPayload(input))
    return fromResource(data.data)
  },

  /** Cascades server-side: deletes the cabinet's drawers too. */
  remove: async (id: string): Promise<void> => {
    await http.delete(`${BASE_PATH}/${id}`)
  },
}
