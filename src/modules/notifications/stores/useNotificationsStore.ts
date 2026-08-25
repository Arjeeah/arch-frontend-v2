import { defineStore } from 'pinia'
import { ref } from 'vue'
import { notificationsApi } from '../api/notificationsApi'

/**
 * Holds just the unread badge count so `NotificationsBell` (60s poll) and
 * `NotificationsListPage` (mark read/all, delete) stay in sync without
 * either one reaching into the other's internals.
 */
export const useNotificationsStore = defineStore('notifications', () => {
  const unreadCount = ref(0)

  async function refreshUnreadCount(): Promise<void> {
    try {
      unreadCount.value = await notificationsApi.unreadCount()
    } catch {
      // Silent by design: this backs a passive background poll and a
      // best-effort refresh after mutations. The pages that actually load
      // notification data surface their own errors via AppErrorState.
    }
  }

  return { unreadCount, refreshUnreadCount }
})
