import { defineStore } from 'pinia'
import { ref } from 'vue'
import { i18n } from '@/app/plugins/i18n'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import { auditApi } from '../api/auditApi'
import type { AuditStat, TimelineEntry } from '../types'

/** Store-level copy. Components read the same keys through `useI18n`. */
function tr(key: string): string {
  return i18n.global.t(key)
}

/**
 * Stats and the live timeline. The log table is `useServerTable` state owned by
 * the page — the store used to reimplement paging, loading and a page count of
 * its own, and lost the composable's stale-response guard doing it.
 *
 * The two calls are deliberately separate. They used to share one
 * `Promise.all`, so an archivist's 403 on the super-admin-only timeline
 * (`AuditLogPolicy::viewTimeline`) rejected the whole thing and threw away the
 * stats result that had already succeeded.
 */
export const useAuditStore = defineStore('audit', () => {
  const stats = ref<AuditStat | null>(null)
  const statsLoading = ref(false)
  const statsError = ref<string | null>(null)

  const timeline = ref<TimelineEntry[]>([])
  const timelineLoading = ref(false)
  const timelineError = ref<string | null>(null)

  async function fetchStats(): Promise<void> {
    statsLoading.value = true
    statsError.value = null
    try {
      stats.value = await auditApi.getStats()
    } catch (err) {
      stats.value = null
      statsError.value = getApiErrorMessage(err, tr('audit.stats.error'))
    } finally {
      statsLoading.value = false
    }
  }

  async function fetchTimeline(): Promise<void> {
    timelineLoading.value = true
    timelineError.value = null
    try {
      timeline.value = await auditApi.getTimeline()
    } catch (err) {
      timeline.value = []
      timelineError.value = getApiErrorMessage(err, tr('audit.timeline.error'))
    } finally {
      timelineLoading.value = false
    }
  }

  return {
    stats,
    statsLoading,
    statsError,
    timeline,
    timelineLoading,
    timelineError,
    fetchStats,
    fetchTimeline,
  }
})
