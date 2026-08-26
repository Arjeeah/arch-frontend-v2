// Notifications module entrypoint
// `NotificationsBell` is the one piece another layer needs to consume
// directly. It is imported by `src/app/layouts/DashboardLayout.vue` and passed
// into `AppHeader` through a named slot — `app` may import a module, `shared`
// (where `AppHeader` lives) may not. See WIRING.md.
export { default as NotificationsBell } from './components/NotificationsBell.vue'
