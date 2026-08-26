// Types for the Locations module (rooms -> cabinets -> drawers).
// These are the camelCase shapes the UI works with — the API layer maps them
// to/from the backend's snake_case wire format. See app/Models/{Room,Cabinet,
// Drawer}.php and app/Http/Resources/{Room,Cabinet,Drawer}Resource.php in the
// backend repo for the wire ground truth.

/** Backend enum `App\Enums\Status`: only these two values exist. */
export type LocationStatus = 'active' | 'inactive'

/**
 * `canvas_data` is deliberately absent from this model. It is a JSON column that
 * `Room::$casts` decodes to an array, so the wire value is an object/array —
 * while `Room{Store,Update}Request` validates it as `nullable|string`. Nothing
 * round-trips cleanly, and this module's browse UI never renders it, so
 * `roomsApi` neither maps it in nor sends it back. `RoomUpdateRequest` uses
 * `sometimes`, so omitting it cannot clobber a value a future floor-plan editor
 * may set.
 */
export interface Room {
  id: string
  name: string
  description: string | null
  status: LocationStatus
  /** Derived from the `cabinets` relation the index/show endpoints eager-load. */
  cabinetsCount: number
  createdAt: string
  updatedAt: string
}

/** The subset of a room the create/edit dialog can submit. */
export type RoomInput = Pick<Room, 'name' | 'description' | 'status'>

export interface Cabinet {
  id: string
  name: string
  /**
   * The parent room's display name, exactly as `CabinetResource` sends it
   * (the resource's capitalised `Room` key — see backend CabinetResource.php).
   * The resource does not expose `room_id` at all, so this module never reads
   * it back off a cabinet; the id is only ever known from the route the
   * cabinet was reached through (`/archive-room/rooms/:roomId`).
   */
  roomName: string
  positionX: number
  positionY: number
  status: LocationStatus
  /** Derived from the `drawers` relation the index/show endpoints eager-load. */
  drawersCount: number
  createdAt: string
  updatedAt: string
}

/** The subset of a cabinet the create/edit dialog can submit. `roomId` is only sent on create — the backend rejects changing it on update (422). */
export type CabinetInput = Pick<Cabinet, 'name' | 'positionX' | 'positionY' | 'status'>

/** Backend-computed capacity signal (`Drawer::capacityStatus()` / `capacityColor()`). */
export type CapacityStatus = 'normal' | 'warning' | 'critical'
export type CapacityColor = 'green' | 'yellow' | 'red'

export interface Drawer {
  id: string
  /**
   * The parent cabinet's display name, exactly as `DrawerResource` sends it
   * (the resource's capitalised `Cabinet` key). Like `Cabinet.roomName`
   * above, the resource never exposes `cabinet_id` back, so it is only known
   * from the route the drawer was reached through.
   */
  cabinetName: string
  number: number
  label: string | null
  capacity: number | null
  status: LocationStatus
  /**
   * `capacityStatus` / `capacityColor` are computed server-side from REAL
   * occupancy — `Drawer::currentCount()` counts the students whose physical
   * file sits in the drawer (eager-loaded via `$withCount = ['students']`),
   * and the thresholds are >=80% "warning"/yellow and >=95% "critical"/red.
   *
   * Do not be misled by a seeded database in which every drawer reads
   * "normal"/"green": that is low occupancy, not a stub. Verified live by
   * filling a capacity-4 drawer — at 3 students it stayed normal/green, at 4
   * it returned "critical"/"red". (The stale `// uses default currentCount = 0`
   * comment in the backend's `DrawerResource` predates that implementation.)
   *
   * Still rendered as-is rather than recomputed: `DrawerResource` emits no
   * occupancy count, so there is no `current_count` on the wire to derive a
   * percentage from client-side.
   */
  capacityStatus: CapacityStatus
  capacityColor: CapacityColor
  createdAt: string
  updatedAt: string
}

/** The subset of a drawer the create/edit dialog can submit. `cabinetId` is only sent on create — the backend rejects changing it on update (422). */
export type DrawerInput = Pick<Drawer, 'number' | 'label' | 'capacity' | 'status'>
