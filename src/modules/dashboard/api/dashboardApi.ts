import { http } from '@/app/plugins/axios'
import type {
  ActivityRow,
  AdminOverview,
  ArchivistOverview,
  AuditStats,
  BorrowStatus,
  FacultyBorrowRow,
  FacultyOverview,
  RoleCount,
  WeeklyDigest,
} from '../types'
import { BORROW_STATUSES } from '../types'

/*
 * The dashboards are read-only aggregates, so this file is all `fromResource`
 * and no `toPayload`.
 *
 * Two things make the mapping unusually defensive:
 *
 * 1. The three dashboard endpoints were written by different hands and do not
 *    agree on casing. `/v1/dashboard` and `/v1/faculty-staff/dashboard` are
 *    plain snake_case; `/v1/dashboard/archivist` sends snake_case *section*
 *    keys (`capacity_warning`, `ocr_queue`, `recent_activity_list`) whose
 *    contents are camelCase (`totalFiles`, `usagePercent`). Both spellings are
 *    handled explicitly rather than by a blanket casing pass.
 * 2. Two known server-side bugs (documented at their call sites below) mean a
 *    section can arrive empty or the whole request can 500. Every reader below
 *    survives a missing key, so a half-broken payload still renders the parts
 *    that did come through.
 */

/** Coerces anything the wire sends into a finite number, defaulting to 0. */
function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/** Trims a wire string to a value the UI can show, or `null` when it is blank. */
function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

/** Narrows a wire status onto the borrowing union; unknown values become `null`. */
function toBorrowStatus(value: unknown): BorrowStatus | null {
  if (typeof value !== 'string') return null
  const lower = value.toLowerCase()
  return (BORROW_STATUSES as readonly string[]).includes(lower) ? (lower as BorrowStatus) : null
}

// ---------------------------------------------------------------------------
// GET /v1/dashboard  (super_admin + archivist)
// ---------------------------------------------------------------------------

interface StorageResource {
  used_bytes?: number
  total_bytes?: number
  percentage?: number
  used_formatted?: string
  total_formatted?: string
}

interface FacultyStorageResource {
  faculty_id?: number
  name_en?: string
  name_ar?: string
  used_bytes?: number
  used_formatted?: string
}

interface WarningResource {
  type?: string
  message?: string
  action?: string
}

interface AdminOverviewResource {
  summary?: { total_archive?: number; active_borrows?: number }
  storage?: StorageResource
  faculty_storage_distribution?: FacultyStorageResource[]
  warnings?: WarningResource[]
}

function adminOverviewFromResource(resource: AdminOverviewResource): AdminOverview {
  const storage = resource.storage ?? {}
  return {
    totalArchive: num(resource.summary?.total_archive),
    activeBorrows: num(resource.summary?.active_borrows),
    storage: {
      usedBytes: num(storage.used_bytes),
      totalBytes: num(storage.total_bytes),
      percentage: num(storage.percentage),
      usedFormatted: str(storage.used_formatted) ?? '0 B',
      totalFormatted: str(storage.total_formatted) ?? '0 B',
    },
    facultyStorage: (resource.faculty_storage_distribution ?? []).map((row, index) => ({
      facultyId: num(row.faculty_id) || index,
      nameEn: str(row.name_en) ?? '',
      nameAr: str(row.name_ar) ?? '',
      usedBytes: num(row.used_bytes),
      usedFormatted: str(row.used_formatted) ?? '0 B',
    })),
    warnings: (resource.warnings ?? []).map((warning) => ({
      type: str(warning.type) ?? 'unknown',
      message: str(warning.message) ?? '',
      action: str(warning.action),
    })),
  }
}

// ---------------------------------------------------------------------------
// GET /v1/dashboard/archivist  (archivist only — super_admin is explicitly 403'd)
// ---------------------------------------------------------------------------

interface ArchivistCapacityResource {
  show?: boolean
  cabinetName?: string
  drawer?: string
  usagePercent?: number
  overrideAllowed?: boolean
}

interface ArchivistActivityResource {
  user?: string | null
  action?: string
  entity?: string | null
  time?: string | null
}

interface ArchivistOverviewResource {
  capacity_warning?: ArchivistCapacityResource
  summary?: {
    totalFiles?: number
    borrowedNow?: number
    overdue?: number
    scansToday?: number
    scansTodayChangePct?: number
  }
  ocr_queue?: { pending?: number; completed?: number; failed?: number }
  recent_activity_list?: ArchivistActivityResource[]
}

function archivistOverviewFromResource(resource: ArchivistOverviewResource): ArchivistOverview {
  const capacity = resource.capacity_warning ?? {}
  const summary = resource.summary ?? {}
  const queue = resource.ocr_queue ?? {}

  return {
    capacityWarning: {
      show: capacity.show === true,
      cabinetName: str(capacity.cabinetName),
      drawer: str(capacity.drawer),
      usagePercent: num(capacity.usagePercent),
      overrideAllowed: capacity.overrideAllowed === true,
    },
    summary: {
      totalFiles: num(summary.totalFiles),
      borrowedNow: num(summary.borrowedNow),
      overdue: num(summary.overdue),
      scansToday: num(summary.scansToday),
      scansTodayChangePct: num(summary.scansTodayChangePct),
    },
    // KNOWN SERVER BUG: `ArchivistDashboardService::getOcrQueueToday()` guards on
    // a `student_documents.ocr_status` column that the pipeline migrations never
    // added, so this section is always `{0, 0, 0}`. Rendered as-is on purpose —
    // the card says "no data" rather than inventing numbers.
    ocrQueue: {
      pending: num(queue.pending),
      completed: num(queue.completed),
      failed: num(queue.failed),
    },
    recentActivity: (resource.recent_activity_list ?? []).map((row, index) => ({
      key: `${row.time ?? index}-${row.action ?? ''}-${index}`,
      action: str(row.action) ?? '',
      // This endpoint sends the raw enum value only; the label is looked up
      // from the i18n fragment, unlike the audit endpoint below.
      actionLabel: null,
      userName: str(row.user),
      target: str(row.entity),
      timestamp: str(row.time),
    })),
  }
}

// ---------------------------------------------------------------------------
// GET /v1/faculty-staff/dashboard  (faculty_staff only)
// ---------------------------------------------------------------------------

interface FacultyBorrowResource {
  document_title?: string
  document_code?: string | null
  student_name?: string | null
  faculty_name?: string | null
  borrowed_by?: string | null
  requested_by?: string | null
  status?: string
  due_date?: string | null
  days_overdue?: number
  borrowed_at?: string | null
  created_at?: string | null
  returned_at?: string | null
}

interface FacultyOverviewResource {
  summary?: {
    total_faculty_files?: number
    active_borrowings_by_user?: number
    active_requests_count?: number
    overdue_files_count?: number
  }
  recent_borrowings?: FacultyBorrowResource[]
  recent_requests?: FacultyBorrowResource[]
  overdue_files?: FacultyBorrowResource[]
}

function facultyRowFromResource(
  resource: FacultyBorrowResource,
  prefix: string,
  index: number,
): FacultyBorrowRow {
  return {
    key: `${prefix}-${resource.document_code ?? index}-${index}`,
    documentTitle: str(resource.document_title) ?? '',
    documentCode: str(resource.document_code),
    studentName: str(resource.student_name),
    facultyName: str(resource.faculty_name),
    // `borrowed_by` on the borrowing/overdue lists, `requested_by` on requests.
    actorName: str(resource.borrowed_by) ?? str(resource.requested_by),
    status: toBorrowStatus(resource.status),
    dueDate: str(resource.due_date),
    daysOverdue:
      typeof resource.days_overdue === 'number' ? Math.round(resource.days_overdue) : null,
    timestamp: str(resource.borrowed_at) ?? str(resource.created_at),
  }
}

function facultyOverviewFromResource(resource: FacultyOverviewResource): FacultyOverview {
  const summary = resource.summary ?? {}
  return {
    summary: {
      totalFacultyFiles: num(summary.total_faculty_files),
      activeBorrowingsByUser: num(summary.active_borrowings_by_user),
      activeRequestsCount: num(summary.active_requests_count),
      overdueFilesCount: num(summary.overdue_files_count),
    },
    recentBorrowings: (resource.recent_borrowings ?? []).map((row, i) =>
      facultyRowFromResource(row, 'borrowing', i),
    ),
    recentRequests: (resource.recent_requests ?? []).map((row, i) =>
      facultyRowFromResource(row, 'request', i),
    ),
    overdueFiles: (resource.overdue_files ?? []).map((row, i) =>
      facultyRowFromResource(row, 'overdue', i),
    ),
  }
}

// ---------------------------------------------------------------------------
// Audit logs — reused here for the admin dashboard's recent-activity feed.
// ---------------------------------------------------------------------------

interface AuditStatsResource {
  total_operations_today?: number
  total_documents?: number
  total_borrowings_today?: number
  /** Present for super_admin only — `AuditLogController::stats()` adds it conditionally. */
  security_alerts_count?: number
}

/** Matches `App\Http\Resources\AuditLogResource`. */
interface AuditLogResource {
  id?: number | string
  timestamp?: string | null
  action?: string
  action_label?: string | null
  target_entity?: string | null
  reference_id?: string | null
  /** Stripped from the payload for faculty_staff. */
  user?: { id?: number | string; name?: string | null } | null
  role?: string | null
}

// ---------------------------------------------------------------------------
// GET /v1/reports/weekly-digest  (super_admin + archivist)
// ---------------------------------------------------------------------------

interface WeeklyDigestResource {
  overdue_files_count?: number
  due_in_7_days_count?: number
  weekly_borrowing_count?: number
  /** Rounded to one decimal server-side. */
  storage_usage_percent?: number
}

function weeklyDigestFromResource(resource: WeeklyDigestResource): WeeklyDigest {
  return {
    overdueFilesCount: num(resource.overdue_files_count),
    dueInSevenDaysCount: num(resource.due_in_7_days_count),
    weeklyBorrowingCount: num(resource.weekly_borrowing_count),
    storageUsagePercent: num(resource.storage_usage_percent),
  }
}

function auditStatsFromResource(resource: AuditStatsResource): AuditStats {
  return {
    totalOperationsToday: num(resource.total_operations_today),
    totalDocuments: num(resource.total_documents),
    totalBorrowingsToday: num(resource.total_borrowings_today),
    securityAlertsCount:
      typeof resource.security_alerts_count === 'number' ? resource.security_alerts_count : null,
  }
}

function activityFromAuditResource(resource: AuditLogResource, index: number): ActivityRow {
  const entity = str(resource.target_entity)
  const reference = str(resource.reference_id)
  return {
    key: String(resource.id ?? `${resource.timestamp ?? ''}-${index}`),
    action: str(resource.action) ?? '',
    actionLabel: str(resource.action_label),
    userName: str(resource.user?.name),
    target: entity && reference ? `${entity} · ${reference}` : (entity ?? reference),
    timestamp: str(resource.timestamp),
  }
}

// ---------------------------------------------------------------------------
// Envelope helpers
// ---------------------------------------------------------------------------

/** `ApiResponse::success()` wraps everything it returns in a single `data` key. */
interface Wrapped<T> {
  data?: T
}

/** A Laravel resource collection: rows in `data`, counts in `meta`. */
interface Paginated<T> {
  data?: T[]
  meta?: { total?: number }
}

export const dashboardApi = {
  /**
   * Super-admin / archivist overview: archive + borrowing totals, storage usage,
   * per-faculty storage split and any active warnings.
   */
  getAdminOverview: async (): Promise<AdminOverview> => {
    const { data } = await http.get<Wrapped<AdminOverviewResource>>('/v1/dashboard')
    return adminOverviewFromResource(data.data ?? {})
  },

  /**
   * Archivist overview. The backend refuses this endpoint for super_admin
   * (403), so only call it for an archivist.
   */
  getArchivistOverview: async (): Promise<ArchivistOverview> => {
    const { data } = await http.get<Wrapped<ArchivistOverviewResource>>('/v1/dashboard/archivist')
    return archivistOverviewFromResource(data.data ?? {})
  },

  /**
   * Faculty-staff overview.
   *
   * KNOWN SERVER BUG: `FacultyStaffDashboardService::getRecentBorrowings()`
   * formats `due_date` unconditionally, but the column is nullable and a
   * *pending* borrowing has no due date yet — so this 500s as soon as one of
   * the staff member's faculties has a pending request. The page catches it and
   * explains, rather than showing a bare error.
   */
  getFacultyOverview: async (): Promise<FacultyOverview> => {
    const { data } = await http.get<Wrapped<FacultyOverviewResource>>('/v1/faculty-staff/dashboard')
    return facultyOverviewFromResource(data.data ?? {})
  },

  /** Audit counters. super_admin + archivist; `securityAlertsCount` is SA-only. */
  getAuditStats: async (): Promise<AuditStats> => {
    const { data } = await http.get<Wrapped<AuditStatsResource>>('/v1/audit-logs/stats')
    return auditStatsFromResource(data.data ?? {})
  },

  /**
   * Recent activity for the admin dashboard, straight off the audit log. Rows
   * are scoped server-side by role, so this is safe to call for anyone.
   */
  getRecentActivity: async (limit = 8): Promise<ActivityRow[]> => {
    const { data } = await http.get<Paginated<AuditLogResource>>('/v1/audit-logs', {
      params: { per_page: limit, sort: 'desc' },
    })
    return (data.data ?? []).map(activityFromAuditResource)
  },

  /**
   * Head count per role for the users card.
   *
   * There is no aggregate endpoint, so this asks the paginated user list for
   * each role and reads `meta.total` — three tiny requests in parallel rather
   * than downloading every user. `/v1/users` is super_admin-only (UserPolicy),
   * which is why the card only appears on the admin dashboard.
   *
   * A user holds exactly one role, so the totals sum to the head count.
   */
  getUserRoleCounts: async (roles: readonly string[]): Promise<RoleCount[]> => {
    const counts = await Promise.all(
      roles.map(async (role) => {
        const { data } = await http.get<Paginated<unknown>>('/v1/users', {
          params: { filter: { role }, per_page: 1 },
        })
        return { role, count: num(data.meta?.total) }
      }),
    )
    return counts
  },

  /**
   * The weekly digest's four KPIs, as JSON.
   *
   * This is the reports module's own summary endpoint (`ReportsService::
   * weeklyDigestMetrics()`) — the same numbers the generated digest report is
   * built from — so the card and the report can never disagree. super_admin and
   * archivist only.
   */
  getWeeklyDigest: async (): Promise<WeeklyDigest> => {
    const { data } = await http.get<Wrapped<WeeklyDigestResource>>('/v1/reports/weekly-digest')
    return weeklyDigestFromResource(data.data ?? {})
  },
}
