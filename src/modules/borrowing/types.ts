// Types for the Borrowing module.
// These are the camelCase shapes the UI works with — the API layer maps them
// to/from the backend's snake_case wire format.

export const BORROWING_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'borrowed',
  'returned',
  'overdue',
] as const

export type BorrowingStatus = (typeof BORROWING_STATUSES)[number]

/**
 * The archived document being borrowed (API: `student_document`).
 *
 * Confirmed against the live API: `id` is a UUID string, never numeric
 * (`Borrowing`/`StudentDocument` both use `HasUuids`). `title` is derived
 * client-side from `file_number` — `StudentDocumentResource` has no `title`
 * field, and its `file_name` is frequently null on real rows, so
 * `file_number` (always populated, `DOC-YYYYMMDD-XXXXXXXX`) is the label.
 */
export interface BorrowingDocument {
  id: string
  title: string
}

/** The user who requested the borrowing (API: `user`). `id` is a UUID string too. */
export interface BorrowingUser {
  id: string
  name: string
}

export interface Borrowing {
  id: string
  document: BorrowingDocument | null
  borrower: BorrowingUser | null
  /** API: `notes` — the field the previous build called "purpose" does not exist on the wire. */
  notes: string
  status: BorrowingStatus
  requestedAt: string | null
  dueDate: string | null
  borrowedAt: string | null
  returnedAt: string | null
  createdAt: string | null
  /**
   * `is_overdue` as the SERVER computed it, or `null` when the field was
   * absent. Authoritative, and it does NOT track `status`: verified live, a
   * row whose due date has passed reports `is_overdue: true` while `status`
   * is still `borrowed` (or `approved`), because the status only flips to
   * `overdue` when the scheduled `borrowings:overdue` command next runs.
   * A client-side `dueDate < today` check on `borrowed` rows alone would miss
   * the approved-but-never-collected case that `Borrowing::isOverdue()` catches.
   */
  isOverdue: boolean | null
  /** `days_until_due` as the server computed it; negative once past due. */
  daysUntilDue: number | null
  /** Set by an archivist/admin on approve or return. */
  adminNotes: string | null
  /** Required by the backend when `status` is `rejected`. */
  rejectionReason: string | null
}

/**
 * The subset of a borrowing the create dialog can submit.
 *
 * Confirmed against the live API: `StoreBorrowingRequest` only validates
 * `student_document_id` (uuid) and `notes` — there is no `purpose` or
 * `due_date` at creation time. The due date is computed server-side when an
 * archivist approves the request (`ApproveBorrowingRequest.due_days`,
 * defaulting from `BorrowingSettings` when omitted — a live approve with no
 * `due_days` came back with `due_date` 14 days out).
 *
 * Two server-side rejections this input cannot pre-empt, both surfaced as a
 * 422 whose `message` the toast already renders verbatim:
 *   - a per-user concurrency cap (`BorrowingSettings.max_active_per_user`,
 *     3 on the verified deployment) counting pending rows too;
 *   - faculty scoping — a faculty-only requester gets 403, not 422, for a
 *     document outside their faculty. The picker cannot offer one anyway:
 *     `/v1/student-documents` is itself faculty-scoped for that role.
 */
export interface BorrowingCreateInput {
  studentDocumentId: string
  notes: string
}

/**
 * `BorrowingController::update` only accepts `notes` — the borrowed document
 * is fixed once the request exists.
 */
export interface BorrowingUpdateInput {
  notes: string
}

/** Workflow transitions available from a given status. */
export function canApprove(status: BorrowingStatus): boolean {
  return status === 'pending'
}

export function canMarkBorrowed(status: BorrowingStatus): boolean {
  return status === 'approved'
}

export function canReturn(status: BorrowingStatus): boolean {
  return status === 'borrowed' || status === 'approved' || status === 'overdue'
}

/** Matches `BorrowingPolicy::update` — the requester can edit their own request only while pending. */
export function canEditOwn(status: BorrowingStatus): boolean {
  return status === 'pending'
}

/** Matches `BorrowingPolicy::delete` — the requester can cancel their own request only while pending. */
export function canCancelOwn(status: BorrowingStatus): boolean {
  return status === 'pending'
}
