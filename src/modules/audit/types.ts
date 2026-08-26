/**
 * Role slugs the audit endpoints accept as a `role` filter.
 *
 * `IndexAuditLogRequest` validates against `UserRole::cases()`, so these are
 * the wire values — not the display labels the filter dropdown used to send,
 * which bounced back as a 422.
 */
export const AUDIT_ROLE_FILTERS = ['super_admin', 'archivist', 'faculty_staff'] as const

export type AuditRoleFilter = (typeof AUDIT_ROLE_FILTERS)[number]

/**
 * Every `App\Enums\AuditAction` case, in declaration order.
 *
 * `IndexAuditLogRequest` validates the `action` filter with
 * `Rule::in(AuditAction::cases())`, so an unknown value here is a 422. Labels
 * live under `common.auditActions.*`, shared with the dashboard's recent
 * activity table, which renders the same enum.
 */
export const AUDIT_ACTIONS = [
  'student_file_checkout',
  'student_file_returned',
  'document_scanned',
  'document_ocr_processed',
  'cabinet_capacity_updated',
  'borrowing_requested',
  'borrowing_extension_requested',
  'high_school_cert_uploaded',
  'duplicate_file_removed_soft_delete',
  'excel_import_completed',
  'view_reports',
  'view_student_files',
  'login',
  'failed_login',
  'report_generated',
  'report_downloaded',
] as const

export type AuditActionValue = (typeof AUDIT_ACTIONS)[number]

export function isAuditAction(value: unknown): value is AuditActionValue {
  return typeof value === 'string' && (AUDIT_ACTIONS as readonly string[]).includes(value)
}

/**
 * The four counters `AuditLogController::stats()` returns.
 *
 * `security_alerts_count` is added only for super_admin, so it is nullable
 * here rather than optional — the card is simply not rendered without it.
 */
export interface AuditStat {
  totalOperationsToday: number | null
  totalDocuments: number | null
  totalBorrowingsToday: number | null
  securityAlertsCount: number | null
}

/**
 * One `AuditLogResource` row. The index and timeline endpoints both return
 * this shape, so the timeline is not a separate model.
 *
 * `userName` / `userRole` are null for a faculty-staff viewer: the resource
 * strips both keys for a user who holds no higher role.
 */
export interface AuditLog {
  id: number
  /** ISO-8601 from `created_at`; format before rendering. */
  timestamp: string | null
  userName: string | null
  userRole: string | null
  /** Raw `AuditAction` value — the key `common.auditActions.*` is looked up by. */
  action: string
  /** `AuditAction::label()`, English and server-rendered. Fallback only. */
  actionLabel: string | null
  targetEntity: string | null
  referenceId: string | null
}

export type TimelineEntry = AuditLog
