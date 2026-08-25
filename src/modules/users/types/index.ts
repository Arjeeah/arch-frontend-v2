/**
 * The three role slugs the backend recognises. `value` is what goes on the
 * wire; `label` is what the UI shows.
 */
export const ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'archivist', label: 'Archivist' },
  { value: 'faculty_staff', label: 'Faculty Staff' },
] as const

export type UserRole = (typeof ROLES)[number]['value']

export type UserStatus = 'Active' | 'Inactive'

/** Returns the readable label for a role slug, falling back to the raw slug. */
export function roleLabel(role: string): string {
  return ROLES.find((r) => r.value === role)?.label ?? role
}

/**
 * A faculty as it appears nested on a user. Declared locally rather than
 * imported from the faculties module — cross-module imports are forbidden.
 */
export interface UserFaculty {
  id: number
  nameEN: string
}

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  status: UserStatus
  createdAt: string
  /** Users belong to many faculties. Read-only in the UI — see UserInput. */
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
}
