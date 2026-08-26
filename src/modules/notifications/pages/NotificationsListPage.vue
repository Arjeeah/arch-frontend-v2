<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { CheckCheck, Inbox } from 'lucide-vue-next'
import AppSelect from '@/shared/components/AppSelect.vue'
import AppButton from '@/shared/components/AppButton.vue'
import AppPagination from '@/shared/components/AppPagination.vue'
import AppEmptyState from '@/shared/components/AppEmptyState.vue'
import AppErrorState from '@/shared/components/AppErrorState.vue'
import AppConfirmDialog from '@/shared/components/AppConfirmDialog.vue'
import { useServerTable } from '@/shared/composables/useServerTable'
import { useToasts } from '@/shared/composables/useToasts'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import { notificationsApi } from '../api/notificationsApi'
import { useNotificationsStore } from '../stores/useNotificationsStore'
import { resolveActionRoute } from '../utils/action-route'
import NotificationListItem from '../components/NotificationListItem.vue'
import type { AppNotification } from '../types'

const { t } = useI18n()
const router = useRouter()
const toasts = useToasts()
const notificationsStore = useNotificationsStore()

const { rows, loading, error, page, totalPages, isEmpty, setFilters, refresh } =
  useServerTable<AppNotification>(notificationsApi.list, {
    perPage: 15,
    errorFallback: t('notifications.list.loadError'),
  })

/** Plain string, not a narrowed union — `AppSelect`'s `v-model` is `string`, matching the rest of the app (see `FacultyListPage`'s `statusFilter`). */
const readFilterValue = ref('')

/**
 * `computed`, not a plain array: `t()` evaluated once at setup would freeze
 * these labels in whichever locale the app booted in, so switching AR/EN from
 * the header would leave the filter reading the old language.
 */
const filterOptions = computed(() => [
  { value: 'unread', label: t('notifications.list.filters.unread') },
  { value: 'read', label: t('notifications.list.filters.read') },
])

/** The empty state should not claim "nothing yet" when a filter is what emptied the list. */
const emptyDescription = computed(() =>
  readFilterValue.value
    ? t('notifications.list.emptyFilteredDescription')
    : t('notifications.list.emptyDescription'),
)

watch(readFilterValue, (value) => {
  setFilters({ read: value === 'unread' ? false : value === 'read' ? true : undefined })
})

const pendingDelete = ref<AppNotification | null>(null)

/**
 * `silent` covers the row-click path, where marking read is incidental to
 * opening the notification — a success toast there would fire on every click.
 * The explicit mark-read button confirms, per the "every mutation reports via
 * toasts" convention.
 */
async function handleMarkRead(item: AppNotification, silent = false): Promise<void> {
  try {
    await notificationsApi.markRead(item.id)
    if (!silent) toasts.success(t('notifications.toasts.markReadSuccess'))
    void notificationsStore.refreshUnreadCount()
    await refresh()
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('notifications.toasts.markReadError')))
  }
}

async function handleRowClick(item: AppNotification): Promise<void> {
  if (!item.readAt) await handleMarkRead(item, true)
  // Backend `action_url`s point at paths this frontend may not serve yet —
  // navigating blindly strands the user on the 404 catch-all.
  const target = resolveActionRoute(router, item.actionUrl)
  if (target) void router.push(target)
  else if (item.actionUrl) toasts.info(t('notifications.toasts.noDestination'))
}

async function confirmDelete(): Promise<void> {
  const item = pendingDelete.value
  if (!item) return
  try {
    await notificationsApi.remove(item.id)
    toasts.success(t('notifications.toasts.deleteSuccess'))
    pendingDelete.value = null
    void notificationsStore.refreshUnreadCount()
    await refresh()
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('notifications.toasts.deleteError')))
  }
}

async function handleMarkAll(): Promise<void> {
  try {
    await notificationsApi.markAllRead()
    toasts.success(t('notifications.toasts.markAllReadSuccess'))
    void notificationsStore.refreshUnreadCount()
    await refresh()
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('notifications.toasts.markAllReadError')))
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-start justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-display font-semibold text-text-primary">
          {{ t('notifications.list.title') }}
        </h1>
        <p class="text-sm text-text-secondary font-sans mt-0.5">
          {{ t('notifications.list.subtitle') }}
        </p>
      </div>
      <AppButton variant="primary" size="md" @click="handleMarkAll">
        <CheckCheck class="w-4 h-4" />
        {{ t('notifications.list.markAllRead') }}
      </AppButton>
    </div>

    <div class="flex items-center gap-3">
      <AppSelect
        v-model="readFilterValue"
        :options="filterOptions"
        :placeholder="t('notifications.list.filters.all')"
      />
    </div>

    <!-- `title` and `retry-label` are passed explicitly: `AppErrorState`'s own
         defaults are hardcoded English, so an Arabic user would otherwise read
         "Something went wrong / Try again" here. -->
    <AppErrorState
      v-if="error"
      :title="t('notifications.list.loadError')"
      :description="error ?? undefined"
      :retry-label="t('notifications.list.retry')"
      @retry="refresh"
    />
    <AppEmptyState
      v-else-if="isEmpty"
      :icon="Inbox"
      :title="t('notifications.list.emptyTitle')"
      :description="emptyDescription"
    />
    <template v-else>
      <div class="bg-surface-card border border-border rounded-lg overflow-hidden">
        <template v-if="loading">
          <div
            v-for="i in 5"
            :key="i"
            class="h-[72px] px-4 py-3 border-b border-border last:border-b-0 animate-pulse"
          >
            <div class="h-4 bg-surface rounded w-1/3 mb-2" />
            <div class="h-3 bg-surface rounded w-2/3" />
          </div>
        </template>
        <template v-else>
          <NotificationListItem
            v-for="item in rows"
            :key="item.id"
            :notification="item"
            @click="handleRowClick(item)"
            @mark-read="handleMarkRead(item)"
            @delete="pendingDelete = item"
          />
        </template>
      </div>

      <AppPagination v-if="totalPages > 1" v-model:currentPage="page" :total-pages="totalPages" />
    </template>

    <AppConfirmDialog
      :open="!!pendingDelete"
      :title="t('notifications.list.deleteConfirmTitle')"
      :confirm-label="t('notifications.list.delete')"
      confirm-class="bg-danger text-white hover:opacity-80"
      @close="pendingDelete = null"
      @confirm="confirmDelete"
    >
      <p class="text-sm text-text-secondary font-sans">
        {{ t('notifications.list.deleteConfirmMessage') }}
      </p>
    </AppConfirmDialog>
  </div>
</template>
