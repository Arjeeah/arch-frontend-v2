<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Bell, Check, Loader2 } from 'lucide-vue-next'
import { useNotificationsStore } from '../stores/useNotificationsStore'
import { notificationsApi } from '../api/notificationsApi'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import { useToasts } from '@/shared/composables/useToasts'
import AppErrorState from '@/shared/components/AppErrorState.vue'
import { resolveActionRoute } from '../utils/action-route'
import NotificationListItem from './NotificationListItem.vue'
import type { AppNotification } from '../types'

/**
 * Standalone dropdown bell. `DashboardLayout` (in `src/app/`, which may import
 * a module) passes it into `AppHeader`'s `#notifications` slot — `AppHeader`
 * itself is in `src/shared/` and may not import a module. See WIRING.md. Owns its
 * own preview list, unread badge (via the shared store so mutations made on
 * the full notifications page are reflected here too) and a 60s poll that
 * starts on mount and is cleared on unmount.
 */

const POLL_MS = 60_000
const PREVIEW_COUNT = 6

const { t } = useI18n()
const router = useRouter()
const toasts = useToasts()
const store = useNotificationsStore()

const open = ref(false)
const items = ref<AppNotification[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

let timer: ReturnType<typeof setInterval> | undefined

async function loadPreview(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const page = await notificationsApi.list({ page: 1, per_page: PREVIEW_COUNT })
    items.value = page.data
  } catch (err) {
    // Surfaced in the dropdown rather than swallowed: a failed fetch that fell
    // through to the empty state would read as "you're all caught up", which is
    // the opposite of the truth.
    items.value = []
    error.value = getApiErrorMessage(err, t('notifications.bell.loadError'))
  } finally {
    loading.value = false
  }
}

function toggle(): void {
  open.value = !open.value
  if (open.value) void loadPreview()
}

async function handleItemClick(item: AppNotification): Promise<void> {
  open.value = false
  if (!item.readAt) {
    try {
      await notificationsApi.markRead(item.id)
      void store.refreshUnreadCount()
    } catch {
      // Non-blocking — navigation still proceeds even if marking read failed.
    }
  }
  // Backend `action_url`s point at paths this frontend may not serve yet —
  // navigating blindly strands the user on the 404 catch-all.
  const target = resolveActionRoute(router, item.actionUrl)
  if (target) void router.push(target)
  else if (item.actionUrl) toasts.info(t('notifications.toasts.noDestination'))
}

async function handleMarkAll(): Promise<void> {
  try {
    await notificationsApi.markAllRead()
    const now = new Date().toISOString()
    items.value = items.value.map((n) => ({ ...n, readAt: n.readAt ?? now }))
    await store.refreshUnreadCount()
    toasts.success(t('notifications.toasts.markAllReadSuccess'))
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('notifications.toasts.markAllReadError')))
  }
}

function viewAll(): void {
  open.value = false
  void router.push('/notifications')
}

onMounted(() => {
  void store.refreshUnreadCount()
  timer = setInterval(() => void store.refreshUnreadCount(), POLL_MS)
})
onUnmounted(() => {
  if (timer !== undefined) clearInterval(timer)
})
</script>

<template>
  <div class="relative">
    <button
      type="button"
      class="relative w-8 h-8 bg-white border border-border rounded-lg flex items-center justify-center"
      :title="t('header.notifications')"
      :aria-expanded="open"
      :aria-label="t('header.notifications')"
      @click="toggle"
    >
      <Bell class="w-4 h-4 text-text-primary" />
      <span
        v-if="store.unreadCount > 0"
        class="absolute -top-1.5 -end-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-danger text-[10px] font-display font-semibold text-white border border-white"
      >
        {{ store.unreadCount > 99 ? '99+' : store.unreadCount }}
      </span>
    </button>

    <!-- Click-away backdrop, same pattern as AppHeader's profile menu -->
    <div v-if="open" class="fixed inset-0 z-10" @click="open = false" />

    <div
      v-if="open"
      class="absolute end-0 top-full mt-2 z-20 w-[360px] max-w-[90vw] bg-surface-card border border-border rounded-lg shadow-lg overflow-hidden font-sans"
    >
      <div class="flex items-center justify-between px-4 py-3 border-b border-border">
        <p class="text-sm font-display font-medium text-text-primary">
          {{ t('notifications.bell.title') }}
        </p>
        <button
          type="button"
          class="flex items-center gap-1 text-xs text-primary transition-opacity hover:opacity-70 disabled:opacity-40"
          :disabled="store.unreadCount === 0"
          @click="handleMarkAll"
        >
          <Check class="w-3.5 h-3.5" />
          {{ t('notifications.bell.markAllRead') }}
        </button>
      </div>

      <div class="max-h-[360px] overflow-y-auto">
        <div v-if="loading" class="flex items-center justify-center py-8">
          <Loader2 class="w-5 h-5 text-text-muted animate-spin" />
        </div>
        <AppErrorState
          v-else-if="error"
          compact
          :title="t('notifications.bell.loadError')"
          :description="error"
          :retry-label="t('notifications.bell.retry')"
          @retry="loadPreview"
        />
        <p v-else-if="!items.length" class="px-4 py-8 text-center text-sm text-text-secondary">
          {{ t('notifications.bell.empty') }}
        </p>
        <template v-else>
          <NotificationListItem
            v-for="item in items"
            :key="item.id"
            :notification="item"
            compact
            @click="handleItemClick(item)"
          />
        </template>
      </div>

      <button
        type="button"
        class="w-full py-2.5 text-center text-sm text-primary font-display font-medium border-t border-border transition-colors hover:bg-surface"
        @click="viewAll"
      >
        {{ t('notifications.bell.viewAll') }}
      </button>
    </div>
  </div>
</template>
