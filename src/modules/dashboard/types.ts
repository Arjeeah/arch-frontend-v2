/**
 * UI models for the three dashboards. Everything here is camelCase and already
 * normalised — the wire shapes (and the mapping between them) live in
 * `api/dashboardApi.ts`, which is the only file that knows what the backend
 * actually sends.
 *
 * The three payloads do not share a casing convention on the wire:
 * `/v1/dashboard` and `/v1/faculty-staff/dashboard` are snake_case, while
 * `/v1/dashboard/archivist` mixes snake_case section keys with camelCase
 * fields inside them. That is exactly why the mappers are explicit.
 */

/** Storage totals as reported by `DashboardService::getStorageStats()`. */
export interface StorageUsage {
  usedBytes: number
  totalBytes: number
  /** Whole percent, already rounded server-side. */
  percentage: number
  /** Server-rendered human string, e.g. "1.4 GB". Preferred over reformatting. */
  usedFormatted: string
  totalFormatted: string
}

/** One faculty's slice of the archive's storage. */
export interface FacultyStorageRow {
  facultyId: number
  nameEn: string
  nameAr: string
  usedBytes: number
  usedFormatted: string
}

/** An operational warning raised by the dashboard service (storage capacity today). */
export interface DashboardWarning {
  type: string
  message: string
  action: string | null
}

/** `GET /v1/dashboard` — super_admin and archivist. */
export interface AdminOverview {
  totalArchive: number
  activeBorrows: number
  storage: StorageUsage
  facultyStorage: FacultyStorageRow[]
  warnings: DashboardWarning[]
}

/** `GET /v1/audit-logs/stats` — super_admin and archivist. */
export interface AuditStats {
  totalOperationsToday: number
  totalDocuments: number
  totalBorrowingsToday: number
  /** super_admin only; the backend omits the key for archivists. */
  securityAlertsCount: number | null
}

/**
 * One row of "recent activity". Both sources — the audit log endpoint and the
 * archivist dashboard's own `recent_activity_list` — are normalised into this
 * shape so a single table component renders either.
 */
export interface ActivityRow {
  key: string
  /** Raw `AuditAction` value; used to look up a translated label. */
  action: string
  /** Label the API rendered for us, when it sent one. */
  actionLabel: string | null
  userName: string | null
  /** Target entity (e.g. "Borrowing"), plus the reference id when present. */
  target: string | null
  timestamp: string | null
}

/**
 * `GET /v1/reports/weekly-digest` — super_admin and archivist.
 *
 * The same four KPIs the weekly-digest report is built from, served as JSON.
 * Note `storageUsagePercent` comes from `StorageService::percentUsed()`, not
 * from the dashboard's own storage block, so the two can differ by a rounding
 * step — they are computed by different services.
 */
export interface WeeklyDigest {
  overdueFilesCount: number
  dueInSevenDaysCount: number
  weeklyBorrowingCount: number
  storageUsagePercent: number
}

/** Head count for one role, for the users-by-role card. */
export interface RoleCount {
  role: string
  count: number
}

/**
 * The users-by-role card's data.
 *
 * `rows` are *exclusive* buckets — each user counted once, under the highest
 * role they hold — and `total` is the unfiltered head count they reconcile to.
 * The derivation (and why the raw API counts cannot be used directly) is
 * documented on `dashboardApi.getUserRoleBreakdown`.
 */
export interface RoleBreakdown {
  total: number
  rows: RoleCount[]
}

/**
 * The three role slugs, in the order the users card lists them.
 *
 * Deliberately re-declared instead of imported from `modules/auth`: modules may
 * not import each other (`eslint-plugin-boundaries`). These are wire values
 * sent to `/v1/users?filter[role]=`, so they must match the backend's
 * `UserRole` enum — not any frontend type.
 */
export const USER_ROLE_SLUGS = ['super_admin', 'archivist', 'faculty_staff'] as const

/** `capacity_warning` — `{ show: false }` when no drawer is near capacity. */
export interface ArchivistCapacityWarning {
  show: boolean
  cabinetName: string | null
  drawer: string | null
  usagePercent: number
  overrideAllowed: boolean
}

export interface ArchivistSummary {
  totalFiles: number
  borrowedNow: number
  overdue: number
  scansToday: number
  /** Percent change against yesterday; negative means fewer scans today. */
  scansTodayChangePct: number
}

export interface OcrQueue {
  pending: number
  completed: number
  failed: number
}

/** `GET /v1/dashboard/archivist` — archivist only (super_admin is refused). */
export interface ArchivistOverview {
  capacityWarning: ArchivistCapacityWarning
  summary: ArchivistSummary
  ocrQueue: OcrQueue
  recentActivity: ActivityRow[]
}

export interface FacultySummary {
  totalFacultyFiles: number
  activeBorrowingsByUser: number
  activeRequestsCount: number
  overdueFilesCount: number
}

/** The borrowing lifecycle, as `App\Enums\BorrowingStatus` spells it. */
export const BORROW_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'borrowed',
  'returned',
  'overdue',
] as const

export type BorrowStatus = (typeof BORROW_STATUSES)[number]

/**
 * A borrowing row on the faculty-staff dashboard. The endpoint returns three
 * lists with overlapping-but-different fields (`borrowed_by` vs `requested_by`,
 * `borrowed_at` vs `created_at`); they are normalised here so one table
 * component can render all three with a different column set.
 */
export interface FacultyBorrowRow {
  key: string
  documentTitle: string
  documentCode: string | null
  studentName: string | null
  facultyName: string | null
  /** Whoever the row is about: the borrower, or the requester. */
  actorName: string | null
  status: BorrowStatus | null
  dueDate: string | null
  daysOverdue: number | null
  /** `borrowed_at` or `created_at`, depending on the list. */
  timestamp: string | null
}

/**
 * One line of the system-health card: a label, a short value and the tone it
 * is rendered in. Assembled by the page from whichever resources have loaded.
 */
export interface HealthItem {
  key: string
  label: string
  value: string
  status: 'good' | 'warning' | 'danger' | 'neutral'
}

/** One figure in the weekly-digest card. */
export interface DigestItem {
  key: string
  label: string
  value: string
  tone: 'danger' | 'success' | 'primary' | 'warning'
}

/** `GET /v1/faculty-staff/dashboard` — faculty_staff only. */
export interface FacultyOverview {
  summary: FacultySummary
  recentBorrowings: FacultyBorrowRow[]
  recentRequests: FacultyBorrowRow[]
  overdueFiles: FacultyBorrowRow[]
}
