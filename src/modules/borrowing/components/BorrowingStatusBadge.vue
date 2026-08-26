<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { BorrowingStatus } from '../types'

const props = defineProps<{
  status: BorrowingStatus
  /**
   * The server's `is_overdue`, which does not move in lockstep with `status`.
   * `Borrowing::isOverdue()` is true the moment the due date passes, but the
   * row only becomes `status: 'overdue'` when the scheduled
   * `borrowings:overdue` command next runs — verified live: a row sat at
   * `status: 'borrowed'` with `is_overdue: true` and `days_overdue: 5` until
   * the command was invoked, then flipped to `overdue`.
   *
   * Without this the badge read "Borrowed" for a row the page's own overdue
   * stat card was already counting, so the same list disagreed with itself
   * for as long as the gap between the due date and the next scheduled run.
   */
  overdue?: boolean | null
}>()

const { t } = useI18n()

/**
 * Overdue outranks the stored status, but only where the two can legitimately
 * co-exist. `returned` and `rejected` are settled outcomes — the server
 * already reports `is_overdue: false` for both — so they are never relabelled
 * even if a stale flag arrives.
 */
const effectiveStatus = computed<BorrowingStatus>(() =>
  props.overdue === true && props.status !== 'returned' && props.status !== 'rejected'
    ? 'overdue'
    : props.status,
)
</script>

<template>
  <span
    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-display font-medium"
    :class="{
      'bg-warning/20 text-warning': effectiveStatus === 'pending',
      'bg-primary/10 text-primary': effectiveStatus === 'approved',
      'bg-success-bg text-success-text': effectiveStatus === 'borrowed',
      'bg-inactive-bg text-inactive-text': effectiveStatus === 'returned',
      'bg-danger/10 text-danger': effectiveStatus === 'rejected',
      'bg-danger text-white': effectiveStatus === 'overdue',
    }"
  >
    {{ t(`borrowing.status.${effectiveStatus}`) }}
  </span>
</template>
