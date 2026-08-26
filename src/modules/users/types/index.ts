/**
 * The three role slugs the backend recognises — exactly what goes on the wire.
 *
 * Slugs only, deliberately: the label a user sees comes from `common.roles.<slug>`
 * in the locale files, never from here. This used to carry an English `label`
 * beside each slug that no call site read, so a contributor could plausibly have
 * wired it back up and shipped "Super Admin" into the Arabic UI.
 */
export const ROLES = ['super_admin', 'archivist', 'faculty_staff'] as const

export type UserRole = (typeof ROLES)[number]

export type UserStatus = 'Active' | 'Inactive'

/**
 * A faculty as it appears nested on a user. Declared locally rather than
 * imported from the faculties module — cross-module imports are forbidden.
 */
export interface UserFaculty {
  id: number
  nameEN: string
}

export interface User {
  // Verified against the running API: an id off the wire looks like
  // `01a03de0-775c-7004-b340-88a0f53663b5` — a UUID string (`HasUuids` on the
  // `User` model), never an integer. Do not parse it as a number.
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  createdAt: string
  /**
   * Users belong to many faculties. Read-only in the UI — see `UserInput.facultyIds`
   * for the write side.
   *
   * Verified against the running API: `UserResource::toArray()` emits exactly
   * `id, name, email, roles, status, created_at, updated_at, last_login` — no
   * `faculties` key on index, show, store or update, even though the controller
   * calls `->load(['roles', 'faculties'])` first. So this is `[]` for every row
   * until `UserResource` is fixed server-side. Kept typed and mapped so the UI
   * starts rendering faculty names the moment the backend catches up; the
   * consequence today is that the edit dialog always opens with an empty
   * selection, which is why `usersApi.toPayload` drops an empty one.
   */
  faculties: UserFaculty[]
}

/** The subset of a user that the create/edit dialog can submit. */
export interface UserInput {
  name: string
  email: string
  role: UserRole
  status: UserStatus
  /** Required by the backend on create; omitted on update to keep the password. */
  password?: string
  /**
   * Faculty ids to assign. Required (min 1) on create, optional on update —
   * see `UserStoreRequest`/`UserUpdateRequest`. Faculty ids themselves are
   * plain integers (the `faculties` table has a normal auto-increment PK).
   */
  facultyIds: number[]
}
