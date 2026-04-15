import type { User } from '../types'

const archivistPermissions = [
  { label: 'View all files', state: 'allowed' as const },
  { label: 'Process Borrowing', state: 'allowed' as const },
  { label: 'Delete Documents', state: 'allowed' as const },
  { label: 'Label', state: 'allowed' as const },
  { label: 'Override', state: 'warning' as const },
  { label: 'Label', state: 'allowed' as const },
  { label: 'Manage User', state: 'denied' as const },
  { label: 'Manage Backup', state: 'denied' as const },
  { label: 'Manage Settings', state: 'denied' as const },
  { label: 'Export Data', state: 'denied' as const },
  { label: 'Delete files', state: 'denied' as const },
]

const adminPermissions = [
  { label: 'View all files', state: 'allowed' as const },
  { label: 'Process Borrowing', state: 'allowed' as const },
  { label: 'Delete Documents', state: 'allowed' as const },
  { label: 'Label', state: 'allowed' as const },
  { label: 'Override', state: 'allowed' as const },
  { label: 'Label', state: 'allowed' as const },
  { label: 'Manage User', state: 'allowed' as const },
  { label: 'Manage Backup', state: 'warning' as const },
  { label: 'Manage Settings', state: 'denied' as const },
  { label: 'Export Data', state: 'denied' as const },
  { label: 'Delete files', state: 'denied' as const },
]

const superAdminPermissions = [
  { label: 'View all files', state: 'allowed' as const },
  { label: 'Process Borrowing', state: 'allowed' as const },
  { label: 'Delete Documents', state: 'allowed' as const },
  { label: 'Label', state: 'allowed' as const },
  { label: 'Override', state: 'allowed' as const },
  { label: 'Label', state: 'allowed' as const },
  { label: 'Manage User', state: 'allowed' as const },
  { label: 'Manage Backup', state: 'allowed' as const },
  { label: 'Manage Settings', state: 'allowed' as const },
  { label: 'Export Data', state: 'allowed' as const },
  { label: 'Delete files', state: 'allowed' as const },
]

const commonActivity = [
  { timestamp: 'Jan 19, 10:15 AM', action: 'file.view', details: 'viewed file #3724' },
  { timestamp: 'Jan 9, 11:05 AM', action: 'document.upload', details: 'upload passport scan to file #3081' },
  { timestamp: 'Jan 19, 10:15 AM', action: 'file.view', details: 'viewed file #3100' },
  { timestamp: 'Jan 18, 2:30 PM', action: 'file.view', details: 'viewed file #2990' },
  { timestamp: 'Jan 17, 9:00 AM', action: 'document.upload', details: 'uploaded ID scan' },
]

export const mockUsers: User[] = [
  { id: 1, name: 'Ahmed Ali', email: 'a@limu.edu.ly', role: 'Archivist', faculties: [], status: 'Active', lastLogin: 'Jan 19, 2026', createdAt: 'Dec 1, 2025', permissions: archivistPermissions, recentActivity: commonActivity },
  { id: 2, name: 'Nour Mohammed', email: 'nour@limu.edu.ly', role: 'Admin', faculties: ['IT'], status: 'Active', lastLogin: 'Jan 18, 2026', createdAt: 'Nov 15, 2025', permissions: adminPermissions, recentActivity: commonActivity },
  { id: 3, name: 'Sara Ahmed Ali', email: 'sara@limu.edu.ly', role: 'Faculty staff', faculties: ['Business', 'Engineering'], status: 'Inactive', lastLogin: 'Jan 10, 2026', createdAt: 'Dec 19, 2025', permissions: archivistPermissions, recentActivity: commonActivity },
  { id: 4, name: 'Mohammed Hassan', email: 'mo@limu.edu.ly', role: 'Admin', faculties: ['Architecture'], status: 'Active', lastLogin: 'Jan 19, 2026', createdAt: 'Oct 5, 2025', permissions: adminPermissions, recentActivity: commonActivity },
  { id: 5, name: 'Aya Alaa', email: 'aya@limu.edu.ly', role: 'Super admin', faculties: ['Medicine'], status: 'Active', lastLogin: 'Jan 20, 2026', createdAt: 'Sep 1, 2025', permissions: superAdminPermissions, recentActivity: commonActivity },
  { id: 6, name: 'Ehab Khalid', email: '21@limu.edu.ly', role: 'Archivist', faculties: ['Law'], status: 'Active', lastLogin: 'Jan 15, 2026', createdAt: 'Dec 10, 2025', permissions: archivistPermissions, recentActivity: commonActivity },
  { id: 7, name: 'Fatima Omar', email: 'fatima@limu.edu.ly', role: 'Faculty staff', faculties: ['IT', 'Business'], status: 'Active', lastLogin: 'Jan 17, 2026', createdAt: 'Nov 20, 2025', permissions: archivistPermissions, recentActivity: commonActivity },
  { id: 8, name: 'Khalid Mansour', email: 'khalid@limu.edu.ly', role: 'Archivist', faculties: ['Engineering'], status: 'Inactive', lastLogin: 'Dec 30, 2025', createdAt: 'Aug 15, 2025', permissions: archivistPermissions, recentActivity: commonActivity },
  { id: 9, name: 'Layla Ibrahim', email: 'layla@limu.edu.ly', role: 'Admin', faculties: ['Medicine', 'Law'], status: 'Active', lastLogin: 'Jan 19, 2026', createdAt: 'Oct 20, 2025', permissions: adminPermissions, recentActivity: commonActivity },
  { id: 10, name: 'Omar Faris', email: 'omar@limu.edu.ly', role: 'Faculty staff', faculties: ['Architecture'], status: 'Active', lastLogin: 'Jan 16, 2026', createdAt: 'Dec 5, 2025', permissions: archivistPermissions, recentActivity: commonActivity },
  { id: 11, name: 'Rania Saleh', email: 'rania@limu.edu.ly', role: 'Archivist', faculties: ['IT'], status: 'Active', lastLogin: 'Jan 14, 2026', createdAt: 'Nov 1, 2025', permissions: archivistPermissions, recentActivity: commonActivity },
  { id: 12, name: 'Tarek Yousef', email: 'tarek@limu.edu.ly', role: 'Admin', faculties: ['Business'], status: 'Inactive', lastLogin: 'Jan 5, 2026', createdAt: 'Sep 10, 2025', permissions: adminPermissions, recentActivity: commonActivity },
  { id: 13, name: 'Salma Nasser', email: 'salma@limu.edu.ly', role: 'Faculty staff', faculties: ['Law', 'Engineering'], status: 'Active', lastLogin: 'Jan 18, 2026', createdAt: 'Dec 15, 2025', permissions: archivistPermissions, recentActivity: commonActivity },
  { id: 14, name: 'Youssef Kamal', email: 'youssef@limu.edu.ly', role: 'Archivist', faculties: ['Medicine'], status: 'Active', lastLogin: 'Jan 12, 2026', createdAt: 'Oct 30, 2025', permissions: archivistPermissions, recentActivity: commonActivity },
  { id: 15, name: 'Hana Malik', email: 'hana@limu.edu.ly', role: 'Super admin', faculties: ['Architecture', 'IT'], status: 'Active', lastLogin: 'Jan 20, 2026', createdAt: 'Aug 1, 2025', permissions: superAdminPermissions, recentActivity: commonActivity },
]
