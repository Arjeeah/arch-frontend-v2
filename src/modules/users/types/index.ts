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
  // verify against live API: `users`/`user_faculties` tables use UUID primary
  // keys (`HasUuids` on the `User` model) — never parse this as a number.
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
   * verify against live API: `UserResource::toArray()` does not emit a
   * `faculties` key at all today, even though the controller loads the
   * relation before returning — so this is always `[]` against the real
   * backend until that resource is fixed. Kept typed and mapped so the UI
   * starts rendering faculty names the moment the backend catches up.
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
