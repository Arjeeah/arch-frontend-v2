import { http } from '@/app/plugins/axios'

export const auditApi = {
  getStats: () => http.get('/v1/audit-logs/stats'),
  getTimeline: () => http.get('/v1/audit-logs/timeline'),
  getLogs: (params: { search?: string; role?: string; page?: number }) =>
    http.get('/v1/audit-logs', { params }),
  exportReport: () => http.get('/v1/audit-logs/export', { responseType: 'blob' }),
}
