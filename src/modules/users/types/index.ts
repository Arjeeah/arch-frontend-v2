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
  role: 'Super Admin' | 'Archivist' | 'Faculty Staff'
  status: 'Active' | 'Inactive'
  created_at: string
}

export const ROLES = ['Super Admin', 'Archivist', 'Faculty Staff'] as const
