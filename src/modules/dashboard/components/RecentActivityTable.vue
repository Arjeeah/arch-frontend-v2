<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import DataTable from '@/shared/components/DataTable.vue'
import { formatDate, relativeTime } from '@/shared/utils/date'
import DashboardCard from './DashboardCard.vue'
import { intlLocale } from '../utils/format'
import type { ActivityRow } from '../types'

/**
 * Recent activity, fed either by the audit log (`/v1/audit-logs`, admin) or by
 * the archivist dashboard's own `recent_activity_list`. Both are normalised to
 * `ActivityRow` in the api file, so this component does not care which.
 */
defineProps<{
  rows: ActivityRow[]
  loading?: boolean
  error?: string | null
}>()

defineEmits<{ retry: [] }>()

const { t, te, locale } = useI18n()

const columns = computed(() => [
  { key: 'action', label: t('dashboard.activity.action'), align: 'left' as const },
  { key: 'user', label: t('dashboard.activity.user'), align: 'left' as const },
  { key: 'target', label: t('dashboard.activity.target'), align: 'left' as const },
  { key: 'timestamp', label: t('dashboard.activity.time'), align: 'right' as const },
])

/**
 * `AuditAction` values, coloured by what they mean operationally: movement of a
 * file in blue, a return in green, anything destructive or failed in red.
 */
const actionTone: Record<string, string> = {
  student_file_checkout: 'text-primary',
  borrowing_requested: 'text-primary',
  borrowing_extension_requested: 'text-primary',
  student_file_returned: 'text-success-text',
  duplicate_file_removed_soft_delete: 'text-danger',
  failed_login: 'text-danger',
  document_scanned: 'text-text-secondary',
  document_ocr_processed: 'text-text-secondary',
  excel_import_completed: 'text-text-secondary',
}

/** `snake_case_action` → `Snake case action`, for a value we have no label for. */
function humanize(action: string): string {
  const spaced = action.replace(/_/g, ' ').trim()
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : '-'
}

/**
 * The audit endpoint sends `action_label` (English, server-rendered); the
 * archivist endpoint sends the bare enum value. Prefer our own translation so
 * the Arabic UI stays Arabic, and fall back to the server's label, then to a
 * humanised slug for an action the fragment has not caught up with.
 */
function actionLabel(row: ActivityRow): string {
  const key = `common.auditActions.${row.action}`
  if (te(key)) return t(key)
  return row.actionLabel ?? humanize(row.action)
}
</script>

<template>
  <DashboardCard
    flush
    :title="t('dashboard.activity.title')"
    :loading="loading"
    :error="error"
    :empty="!rows.length"
    :empty-title="t('dashboard.activity.empty')"
    :empty-description="t('dashboard.activity.emptyHint')"
    :retry-label="t('dashboard.retry')"
    :skeleton-rows="5"
    @retry="$emit('retry')"
  >
    <DataTable :columns="columns" variant="plain">
      <template #rows>
        <tr
          v-for="row in rows"
          :key="row.key"
          class="border-t border-border hover:bg-surface transition-colors"
        >
          <td
            class="px-3 py-3 text-sm font-sans font-medium"
            :class="actionTone[row.action] ?? 'text-text-primary'"
          >
            {{ actionLabel(row) }}
          </td>
          <td class="px-3 py-3 text-sm text-text-primary font-sans">{{ row.userName ?? '-' }}</td>
          <td class="px-3 py-3 text-sm text-text-secondary font-sans">{{ row.target ?? '-' }}</td>
          <td
            class="px-3 py-3 text-sm text-text-muted font-sans text-end"
            :title="formatDate(row.timestamp)"
          >
            {{ relativeTime(row.timestamp, intlLocale(locale)) }}
          </td>
        </tr>
      </template>
    </DataTable>
  </DashboardCard>
</template>
