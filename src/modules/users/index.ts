// Users module entrypoint
// Re-export only what other layers need to consume directly.
export { usersApi } from './api/usersApi'
export { useUsersStore } from './stores/useUsersStore'
export * from './types'
