// Notifications module entrypoint
// `NotificationsBell` is the one piece another layer needs to consume
// directly: the app shell mounts it inside `AppHeader` (see WIRING.md — the
// router-layer exception is what makes an app -> module import legal here).
export { default as NotificationsBell } from './components/NotificationsBell.vue'
