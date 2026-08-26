<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { MailOpen, Trash2 } from 'lucide-vue-next'
import { relativeTime } from '@/shared/utils/date'
import { resolveNotificationIcon } from '../utils/notification-icon'
import type { AppNotification } from '../types'

withDefaults(
  defineProps<{
    notification: AppNotification
    /** Compact rendering for the header bell dropdown: no row actions, body truncates. */
    compact?: boolean
  }>(),
  { compact: false },
)

const emit = defineEmits<{ click: []; markRead: []; delete: [] }>()

const { t, locale } = useI18n()

const severityClasses: Record<AppNotification['severity'], string> = {
  info: 'bg-primary/10 text-primary',
  success: 'bg-success-bg text-success-text',
  warning: 'bg-warning/15 text-warning',
  error: 'bg-danger/10 text-danger',
}
</script>

<template>
  <div
    class="flex items-start gap-3 px-4 py-3 border-b border-border last:border-b-0 cursor-pointer transition-colors hover:bg-surface"
    :class="{ 'bg-highlight/30': !notification.readAt }"
    @click="emit('click')"
  >
    <span
      class="flex items-center justify-center w-8 h-8 rounded-full shrink-0"
      :class="severityClasses[notification.severity]"
    >
      <component :is="resolveNotificationIcon(notification.icon)" class="w-4 h-4" />
    </span>

    <div class="min-w-0 flex-1">
      <div class="flex items-start justify-between gap-2">
        <p class="text-sm font-display font-medium text-text-primary truncate">
          {{ notification.title }}
        </p>
        <span
          v-if="!notification.readAt"
          class="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0"
        />
      </div>
      <p class="text-xs text-text-secondary mt-0.5" :class="{ truncate: compact }">
        {{ notification.body }}
      </p>
      <p class="text-[11px] text-text-muted mt-1">
        {{ relativeTime(notification.createdAt, locale) }}
      </p>
    </div>

    <div v-if="!compact" class="flex items-center gap-1 shrink-0" @click.stop>
      <button
        v-if="!notification.readAt"
        type="button"
        class="p-1.5 rounded text-text-secondary transition-colors hover:bg-surface hover:text-primary"
        :title="t('notifications.list.markRead')"
        @click="emit('markRead')"
      >
        <MailOpen class="w-4 h-4" />
      </button>
      <button
        type="button"
        class="p-1.5 rounded text-text-secondary transition-colors hover:bg-surface hover:text-danger"
        :title="t('notifications.list.delete')"
        @click="emit('delete')"
      >
        <Trash2 class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>
