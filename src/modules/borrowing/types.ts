// Types for the Borrowing module

export interface Borrowing {
  id: number
  fileNumber: string
  borrowerName: string
  faculty: string
  purpose: string
  borrowDate: string
  dueDate: string
  returnDate: string
  status: 'borrowed' | 'returned' | 'overdue'
  createdAt: string
}
