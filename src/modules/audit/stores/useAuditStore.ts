import { defineStore } from 'pinia'
import { ref } from 'vue'
import { auditApi } from '../api/AuditApi'
import type { AuditLog, TimelineEntry, AuditStat } from '../types/types'

export const useAuditStore = defineStore('audit', () => {
  const stats = ref<AuditStat | null>(null)
  const timeline = ref<TimelineEntry[]>([])
  const logs = ref<AuditLog[]>([])
  const loading = ref(false)
  const logsLoading = ref(false)
  const totalPages = ref(1)

  const fetchDashboardData = async () => {
    loading.value = true
    try {
      const [statsRes, timelineRes] = await Promise.all([
        auditApi.getStats(),
        auditApi.getTimeline(),
      ])
      stats.value = statsRes.data
      timeline.value = timelineRes.data.data || timelineRes.data
    } catch (err) {
      console.error('Failed to fetch audit dashboard data', err)
    } finally {
      loading.value = false
    }
  }

  const fetchLogs = async (params: { search?: string; role?: string; page?: number }) => {
    logsLoading.value = true
    try {
      const res = await auditApi.getLogs(params)
      logs.value = res.data.data
      totalPages.value = res.data.meta?.last_page || 1
    } catch (err) {
      console.error('Failed to fetch logs', err)
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
