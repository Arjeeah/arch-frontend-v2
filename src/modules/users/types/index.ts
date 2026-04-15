export interface Permission {
  label: string
  state: 'allowed' | 'warning' | 'denied'
}

export interface Activity {
  timestamp: string
  action: string
  details: string
}

export interface User {
  id: number
  name: string
  email: string
  role: string
  faculties: string[]
  status: 'Active' | 'Inactive'
  lastLogin: string
  createdAt: string
  permissions: Permission[]
  recentActivity: Activity[]
}

export const ROLES = ['Super admin', 'Admin', 'Archivist', 'Faculty staff'] as const
export const FACULTIES = ['IT', 'Business', 'Architecture', 'Medicine', 'Law', 'Engineering'] as const
