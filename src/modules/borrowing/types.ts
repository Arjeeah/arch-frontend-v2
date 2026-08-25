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

/** The archived document being borrowed (API: `student_document`). */
export interface BorrowingDocument {
  id: number
  title: string
}

/** The user who requested the borrowing (API: `user`). */
export interface BorrowingUser {
  id: number
  name: string
}

export interface Borrowing {
  id: number
  document: BorrowingDocument | null
  borrower: BorrowingUser | null
  purpose: string
  status: BorrowingStatus
  dueDate: string | null
  borrowedAt: string | null
  returnedAt: string | null
  createdAt: string | null
}

/**
 * The subset of a borrowing the create/edit dialog can submit. Status is not
 * included: it only ever changes through the approve / mark-borrowed / return
 * workflow endpoints.
 */
export interface BorrowingInput {
  studentDocumentId: number
  purpose: string
  dueDate: string
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
