export interface AuditStat {
  totalOperationsToday: number
  operationsChange: string // e.g. "+12% from yesterday"
  usersLoggedIn: number
  totalUsers: number
}

export interface TimelineEntry {
  id: number
  action: string
  userName: string
  userRole: string
  timestamp: string
}

export interface AuditLog {
  id: number
  timestamp: string
  userName: string
  userRole: string
  action: string
  targetEntity: string
  referenceId: string
}
