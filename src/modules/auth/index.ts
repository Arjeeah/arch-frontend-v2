// Auth module entrypoint
// The role slugs and the session user shape are consumed outside this module:
// `src/app/config/authStorage.ts` and `sessionRole.ts` both build on them, and
// the router's `meta.roles` is typed from `UserRole`.
export { useAuthStore } from './store/useAuthStore'
export { AUTH_ROLES } from './types'
export type { AuthUser, LoginCredentials, LoginResponse, UserRole } from './types'
