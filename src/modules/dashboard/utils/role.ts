/**
 * Re-exported from `src/app/config/` — `dashboard`, `audit`, `notifications`
 * and `search` all need the session role, and a module may not import another
 * module, so the one implementation lives next to `authStorage`.
 */
export { readSessionRole } from '@/app/config/sessionRole'
