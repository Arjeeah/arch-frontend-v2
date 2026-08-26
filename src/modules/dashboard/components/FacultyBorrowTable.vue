<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import DataTable from '@/shared/components/DataTable.vue'
import StatusBadge from '@/shared/components/StatusBadge.vue'
import { formatDate, relativeTime } from '@/shared/utils/date'
import DashboardCard from './DashboardCard.vue'
import { formatNumber, intlLocale } from '../utils/format'
import type { BorrowStatus, FacultyBorrowRow } from '../types'

/**
 * The faculty-staff dashboard returns three borrowing lists with overlapping
 * fields; `dashboardApi` normalises them to one row type and this table picks
 * the columns that make sense for each. Column order is the same canonical
 * order in every variant, so the cells below can stay in one fixed sequence.
 */
const props = defineProps<{
  variant: 'borrowings' | 'requests' | 'overdue'
  rows: FacultyBorrowRow[]
  loading?: boolean
}>()

// No error state here: all three lists come from one request, so the page owns
// the failure (and the retry) rather than repeating the same message per table.

const { t, locale } = useI18n()

const COLUMN_KEYS: Record<typeof props.variant, readonly string[]> = {
  borrowings: ['document', 'student', 'actor', 'status', 'dueDate'],
  requests: ['document', 'student', 'actor', 'status', 'timestamp'],
  overdue: ['document', 'student', 'actor', 'dueDate', 'daysOverdue'],
}

/** Label per column, with the actor column renamed for the requests list. */
const columns = computed(() =>
  COLUMN_KEYS[props.variant].map((key) => ({
    key,
    label:
      key === 'actor' && props.variant === 'requests'
        ? t('dashboard.borrowTable.requestedBy')
        : t(`dashboard.borrowTable.${key}`),
    align: (key === 'daysOverdue' ? 'right' : 'left') as 'left' | 'right',
  })),
)

function has(key: string): boolean {
  return COLUMN_KEYS[props.variant].includes(key)
}

/** Borrowing lifecycle → the five tones `StatusBadge` knows about. */
const BADGE_STATUS: Record<
  BorrowStatus,
  'active' | 'inactive' | 'pending' | 'overdue' | 'returned'
> = {
  pending: 'pending',
  approved: 'active',
  borrowed: 'active',
  returned: 'returned',
  overdue: 'overdue',
  rejected: 'inactive',
}
</script>

<template>
  <DashboardCard
    flush
    :title="t(`dashboard.borrowTable.${variant}Title`)"
    :loading="loading"
    :empty="!rows.length"
    :empty-title="t(`dashboard.borrowTable.${variant}Empty`)"
    :skeleton-rows="4"
  >
    <DataTable :columns="columns" variant="plain">
      <template #rows>
        <tr
          v-for="row in rows"
          :key="row.key"
          class="border-t border-border hover:bg-surface transition-colors"
        >
          <td v-if="has('document')" class="px-3 py-3 font-sans">
            <span class="block text-sm text-text-primary">{{ row.documentTitle || '-' }}</span>
            <span v-if="row.documentCode" class="block text-xs text-text-muted">
              {{ row.documentCode }}
            </span>
          </td>

          <td v-if="has('student')" class="px-3 py-3 font-sans">
            <span class="block text-sm text-text-primary">{{ row.studentName ?? '-' }}</span>
            <span v-if="row.facultyName" class="block text-xs text-text-muted">
              {{ row.facultyName }}
            </span>
          </td>

          <td v-if="has('actor')" class="px-3 py-3 text-sm text-text-secondary font-sans">
            {{ row.actorName ?? '-' }}
          </td>

          <td v-if="has('status')" class="px-3 py-3">
            <StatusBadge v-if="row.status" :status="BADGE_STATUS[row.status]">
              {{ t(`dashboard.borrowStatus.${row.status}`) }}
            </StatusBadge>
            <span v-else class="text-sm text-text-muted font-sans">-</span>
          </td>

          <td v-if="has('dueDate')" class="px-3 py-3 text-sm text-text-secondary font-sans">
            {{ formatDate(row.dueDate) }}
          </td>

          <!-- Bare count: the column header already names the unit, and an
               Arabic "{n} يوم" would be wrong for every count but one. -->
          <td v-if="has('daysOverdue')" class="px-3 py-3 text-sm font-sans text-end text-danger">
            {{ row.daysOverdue === null ? '-' : formatNumber(row.daysOverdue, locale) }}
          </td>

          <td
            v-if="has('timestamp')"
            class="px-3 py-3 text-sm text-text-muted font-sans"
            :title="formatDate(row.timestamp)"
          >
            {{ relativeTime(row.timestamp, intlLocale(locale)) }}
          </td>
        </tr>
      </template>
    </DataTable>
  </DashboardCard>
</template>
