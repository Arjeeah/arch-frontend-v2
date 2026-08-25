import { defineStore } from 'pinia'
import { ref } from 'vue'
import { auditApi, type AuditLogQuery } from '../api/auditApi'
import { useToasts } from '@/shared/composables/useToasts'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import type { AuditLog, TimelineEntry, AuditStat } from '../types'

export const useAuditStore = defineStore('audit', () => {
  const toasts = useToasts()

  const stats = ref<AuditStat | null>(null)
  const timeline = ref<TimelineEntry[]>([])
  const logs = ref<AuditLog[]>([])
  const loading = ref(false)
  const logsLoading = ref(false)
  const totalPages = ref(1)

  const fetchDashboardData = async () => {
    loading.value = true
    try {
      const [statsResult, timelineResult] = await Promise.all([
        auditApi.getStats(),
        auditApi.getTimeline(),
      ])
      stats.value = statsResult
      timeline.value = timelineResult
    } catch (err) {
      toasts.error(getApiErrorMessage(err, 'Failed to load the audit dashboard'))
    } finally {
      loading.value = false
    }
  }

  const fetchLogs = async (params: AuditLogQuery) => {
    logsLoading.value = true
    try {
      const page = await auditApi.getLogs(params)
      logs.value = page.logs
      totalPages.value = page.totalPages
    } catch (err) {
      toasts.error(getApiErrorMessage(err, 'Failed to load audit logs'))
    } finally {
      logsLoading.value = false
    }
  }

  return {
    stats,
    timeline,
    logs,
    loading,
    logsLoading,
    totalPages,
    fetchDashboardData,
    fetchLogs,
  }
})
