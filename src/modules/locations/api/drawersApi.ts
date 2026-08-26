import { http } from '@/app/plugins/axios'
import type {
  ServerTableParams,
  ServerTableMeta,
  ServerTableResponse,
} from '@/shared/composables/useServerTable'
import type { CapacityColor, CapacityStatus, Drawer, DrawerInput, LocationStatus } from '../types'

/** `/v1/location/drawers` — see Admin/Location/DrawerController.php. */
const BASE_PATH = '/v1/location/drawers'

/** A drawer exactly as `DrawerResource` sends it (note the capitalised `Cabinet` key). */
interface DrawerResource {
  id: string
  Cabinet: string
  number: number
  label: string | null
  capacity: number | null
  status: string
  capacity_status: string
  capacity_color: string
  created_at: string
  updated_at: string
}

interface DrawerItemResponse {
  data: DrawerResource
}

interface DrawerListResponse {
  data: DrawerResource[]
  meta: ServerTableMeta
}

/** Same `Status::class` cast as `Drawer::$casts` — see `roomsApi.toStatus`. */
function toStatus(raw: string): LocationStatus {
  return raw === 'inactive' ? 'inactive' : 'active'
}

function toCapacityStatus(raw: string): CapacityStatus {
  return raw === 'warning' || raw === 'critical' ? raw : 'normal'
}

function toCapacityColor(raw: string): CapacityColor {
  return raw === 'yellow' || raw === 'red' ? raw : 'green'
}

function fromResource(resource: DrawerResource): Drawer {
  return {
    id: resource.id,
    cabinetName: resource.Cabinet,
    number: resource.number,
    label: resource.label,
    capacity: resource.capacity,
    status: toStatus(resource.status),
    capacityStatus: toCapacityStatus(resource.capacity_status),
    capacityColor: toCapacityColor(resource.capacity_color),
    createdAt: resource.created_at,
    updatedAt: resource.updated_at,
  }
}

function toPayload(input: Partial<DrawerInput>): Record<string, string | number | null> {
  const payload: Record<string, string | number | null> = {}
  if (input.number !== undefined) payload.number = input.number
  if (input.label !== undefined) payload.label = input.label
  if (input.capacity !== undefined) payload.capacity = input.capacity
  if (input.status !== undefined) payload.status = input.status
  return payload
}

/** Filters the drawers browse page exposes. `cabinetId` is always set — this page only ever browses one cabinet's drawers. */
export interface DrawerListParams extends ServerTableParams {
  cabinetId: string
  label?: string
  status?: LocationStatus | ''
}

export const drawersApi = {
  /** One page of a cabinet's drawers. See `roomsApi.list` for the `filter[...]` nesting note. */
  list: async (params: DrawerListParams): Promise<ServerTableResponse<Drawer>> => {
    const { page, per_page, cabinetId, label, status } = params
    const filter: Record<string, string> = { cabinet_id: cabinetId }
    if (label) filter.label = label
    if (status) filter.status = status

    const { data } = await http.get<DrawerListResponse>(BASE_PATH, {
      params: { filter, page, per_page },
    })
    return { data: data.data.map(fromResource), meta: data.meta }
  },

  show: async (id: string): Promise<Drawer> => {
    const { data } = await http.get<DrawerItemResponse>(`${BASE_PATH}/${id}`)
    return fromResource(data.data)
  },

  /**
   * `cabinet_id` is required by `DrawerStoreRequest` but is never surfaced as
   * a form field — the caller always creates a drawer from inside a
   * cabinet's drawer list, so the id comes from the route.
   *
   * A cabinet already gets its canonical 4 drawers auto-created (and
   * reconciled back to 4 on every cabinet update), so this only matters for
   * the edge case of a drawer that got deleted individually and needs
   * re-adding — a later cabinet edit would otherwise just recreate it anyway.
   *
   * CAUTION on the returned `Drawer` when `capacity` was omitted: its
   * `capacity` is `null`, which is NOT what was stored. `DrawerController::store`
   * responds with the un-refreshed model, so a column-default value the insert
   * applied is missing from the 201 body — verified live, the create said
   * `capacity: null` while an immediate GET of the same drawer said `100`.
   * Callers must re-read rather than trust this field; `CabinetDrawersPage`
   * discards the return value and refreshes the table, so nothing renders it.
   */
  create: async (cabinetId: string, input: DrawerInput): Promise<Drawer> => {
    const payload = toPayload(input)

    // `DrawerStoreRequest` marks `capacity` as `nullable`, but the column is
    // `integer NOT NULL DEFAULT 100` (create_drawers_table migration), so an
    // explicit null clears validation and then dies on the NOT NULL constraint
    // — confirmed live, that request answers 500 with an SQLSTATE[23000]
    // "NOT NULL constraint failed: drawers.capacity". Omitting the key instead
    // is what "leave it blank" has to mean: the column default is applied.
    if (payload.capacity === null) delete payload.capacity

    const { data } = await http.post<DrawerItemResponse>(BASE_PATH, {
      cabinet_id: cabinetId,
      ...payload,
    })
    return fromResource(data.data)
  },

  /**
   * Never sends `cabinet_id` — confirmed live, `DrawerController::update`
   * answers 422 "Changing cabinet_id is not supported via update() without
   * move logic." for a different id (the same id passes, but there is no
   * reason to send it).
   *
   * `capacity` is stricter here than on create: `DrawerUpdateRequest` rules it
   * `sometimes|required|integer|min:1`, so null 422s ("The capacity field is
   * required.") and 0 422s ("must be at least 1.") — both verified — whereas
   * create allows `nullable|min:0`. `DrawerFormDialog` enforces the tighter
   * rule whenever it is editing, which is why the null-stripping that `create`
   * needs has no counterpart here.
   */
  update: async (id: string, input: Partial<DrawerInput>): Promise<Drawer> => {
    const { data } = await http.put<DrawerItemResponse>(`${BASE_PATH}/${id}`, toPayload(input))
    return fromResource(data.data)
  },

  remove: async (id: string): Promise<void> => {
    await http.delete(`${BASE_PATH}/${id}`)
  },
}
