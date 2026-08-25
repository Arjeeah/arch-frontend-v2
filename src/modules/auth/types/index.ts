export interface LoginCredentials {
  email: string
  password: string
}

/**
 * The role slugs the backend issues. A user holds exactly one of them; route
 * access is decided from it in `src/app/router/index.ts` (`meta.roles`).
 */
export const AUTH_ROLES = ['super_admin', 'archivist', 'faculty_staff'] as const

export type UserRole = (typeof AUTH_ROLES)[number]

export interface AuthUser {
  id: number
  name: string
  email: string
  role: UserRole
}

export interface LoginResponse {
  token: string
  user: AuthUser
}
