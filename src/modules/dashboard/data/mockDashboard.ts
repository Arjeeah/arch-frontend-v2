// src/modules/dashboard/data/mockDashboard.ts

export const statCards = [
  {
    label: 'Total Files',
    value: '14,525',
    subLabel: 'Active student files',
    icon: 'File',
  },
  {
    label: 'Total Users',
    value: '342',
    subLabel: 'All system users',
    icon: 'Users',
  },
  {
    label: 'Active Borrows',
    value: '7',
    subLabel: 'Files out of archive',
    icon: 'BookOpen',
  },
  {
    label: 'Security Alerts',
    value: '7',
    subLabel: 'Failed login attempts',
    icon: 'AlertCircle',
  },
] as const

export const filesPerMonth = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  data: [60, 75, 90, 105, 110, 95, 100, 115, 125, 130, 140, 150],
} as const

export const borrowingsByFaculty = {
  labels: ['Medicine', 'Arts', 'Science', 'Business', 'Law'],
  data: [140, 80, 100, 60, 90],
} as const

export const systemHealth = [
  { label: 'Database', value: '99.8% uptime', status: 'good' },
  { label: 'Storage', value: '62% used', status: 'warning' },
  { label: 'Backup', value: 'Last: 2 hours ago', status: 'neutral' },
] as const

export const usersByRole = [
  { role: 'Super Admin', count: 3 },
  { role: 'Archivist', count: 12 },
  { role: 'Faculty Staff', count: 375 },
] as const

export const weeklyDigest = [
  { label: 'Overdue Files', value: 8, color: 'danger' },
  { label: 'Due in 7 days', value: 0, color: 'success' },
  { label: 'Weekly Borrowing', value: 42, color: 'primary' },
  { label: 'Storage Usage', value: '62%', color: 'warning' },
] as const

export const recentActivity = [
  { action: 'File Borrowed', user: 'Nour Khalid', file: 'File: 2020213', timestamp: '2 hours ago' },
  { action: 'File Returned', user: 'Ahmed Ali', file: 'File: 2020214', timestamp: '4 hours ago' },
  { action: 'File Overdue', user: 'Mohammed', file: 'File: 2020215', timestamp: '14 hours ago' },
  { action: 'File Returned', user: 'Abdullah Omar', file: 'File: 2020216', timestamp: '2 hours ago' },
  { action: 'OCR Completed', user: 'Sara Ali', file: 'File: 2020217', timestamp: '7 hours ago' },
] as const
