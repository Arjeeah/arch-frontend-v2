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
 * verify against live API: `Borrowing`/`StudentDocument` both use `HasUuids`
 * — `id` is a UUID string, never numeric. `title` is derived client-side
 * from `file_number` (there is no `title` field on `StudentDocumentResource`).
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
  /** Set by an archivist/admin on approve or return. */
  adminNotes: string | null
  /** Required by the backend when `status` is `rejected`. */
  rejectionReason: string | null
}

/**
 * The subset of a borrowing the create dialog can submit.
 *
 * verify against live API: `StoreBorrowingRequest` only validates
 * `student_document_id` (uuid) and `notes` — there is no `purpose` or
 * `due_date` at creation time. The due date is computed server-side when an
 * archivist approves the request (`ApproveBorrowingRequest.due_days`,
 * defaulting from `BorrowingSettings` when omitted).
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
