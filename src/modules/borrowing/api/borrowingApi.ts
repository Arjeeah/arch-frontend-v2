import { http } from '@/app/plugins/axios'
import { API_ENDPOINTS } from '@/app/config/api'
import { BORROWING_STATUSES } from '../types'
import type { Borrowing, BorrowingInput, BorrowingStatus } from '../types'

/** The archived document nested on a borrowing (snake_case). */
interface StudentDocumentResource {
  id: number
  // verify against live API: the exact label field on student_document.
  title?: string | null
}

/** The requesting user nested on a borrowing (snake_case). */
interface BorrowingUserResource {
  id: number
  name?: string | null
}

/** A borrowing exactly as the backend sends it (Laravel resource, snake_case). */
interface BorrowingResource {
  id: number
  purpose?: string | null
  status: string
  due_date?: string | null
  borrowed_at?: string | null
  returned_at?: string | null
  created_at?: string | null
  student_document?: StudentDocumentResource | null
  user?: BorrowingUserResource | null
}

/** Single-record responses are wrapped in a `data` key. */
interface BorrowingItemResponse {
  data: BorrowingResource
}

/** `index` is paginated: `{ data: [...], meta, links }`. */
interface BorrowingListResponse {
  data: BorrowingResource[]
}

function toStatus(raw: string): BorrowingStatus {
  const value = raw.toLowerCase()
  return BORROWING_STATUSES.find((status) => status === value) ?? 'pending'
}

/** snake_case wire format -> camelCase UI model. */
function fromResource(resource: BorrowingResource): Borrowing {
  const document = resource.student_document
  const user = resource.user
  return {
    id: resource.id,
    document: document ? { id: document.id, title: document.title ?? `#${document.id}` } : null,
    borrower: user ? { id: user.id, name: user.name ?? `#${user.id}` } : null,
    purpose: resource.purpose ?? '',
    status: toStatus(resource.status),
    dueDate: resource.due_date ?? null,
    borrowedAt: resource.borrowed_at ?? null,
    returnedAt: resource.returned_at ?? null,
    createdAt: resource.created_at ?? null,
  }
}

/** camelCase UI model -> snake_case request payload. */
function toPayload(input: Partial<BorrowingInput>): Record<string, string | number> {
  const payload: Record<string, string | number> = {}
  // verify against live API: the create payload key for the borrowed document.
  if (input.studentDocumentId !== undefined) payload.student_document_id = input.studentDocumentId
  if (input.purpose !== undefined) payload.purpose = input.purpose
  if (input.dueDate !== undefined) payload.due_date = input.dueDate
  return payload
}

export const borrowingApi = {
  /**
   * Returns one page of borrowings. The backend paginates the index endpoint;
   * with no params it responds with the first page.
   */
  list: async (params?: { page?: number; per_page?: number }): Promise<Borrowing[]> => {
    const { data } = await http.get<BorrowingListResponse>(API_ENDPOINTS.borrowings.list, {
      params,
    })
    return data.data.map(fromResource)
  },

  show: async (id: number): Promise<Borrowing> => {
    const { data } = await http.get<BorrowingItemResponse>(API_ENDPOINTS.borrowings.show(id))
    return fromResource(data.data)
  },

  create: async (input: BorrowingInput): Promise<Borrowing> => {
    const { data } = await http.post<BorrowingItemResponse>(
      API_ENDPOINTS.borrowings.create,
      toPayload(input),
    )
    return fromResource(data.data)
  },

  update: async (id: number, input: Partial<BorrowingInput>): Promise<Borrowing> => {
    const { data } = await http.patch<BorrowingItemResponse>(
      API_ENDPOINTS.borrowings.update(id),
      toPayload(input),
    )
    return fromResource(data.data)
  },

  delete: async (id: number): Promise<void> => {
    await http.delete(API_ENDPOINTS.borrowings.delete(id))
  },

  /** pending -> approved. */
  approve: async (id: number): Promise<Borrowing> => {
    const { data } = await http.post<BorrowingItemResponse>(API_ENDPOINTS.borrowings.approve(id), {
      action: 'approve',
    })
    return fromResource(data.data)
  },

  /** pending -> rejected. */
  reject: async (id: number): Promise<Borrowing> => {
    const { data } = await http.post<BorrowingItemResponse>(API_ENDPOINTS.borrowings.approve(id), {
      action: 'reject',
    })
    return fromResource(data.data)
  },

  /** approved -> borrowed. */
  markBorrowed: async (id: number): Promise<Borrowing> => {
    const { data } = await http.post<BorrowingItemResponse>(
      API_ENDPOINTS.borrowings.markBorrowed(id),
    )
    return fromResource(data.data)
  },

  /** borrowed / approved / overdue -> returned. */
  markReturned: async (id: number): Promise<Borrowing> => {
    const { data } = await http.post<BorrowingItemResponse>(API_ENDPOINTS.borrowings.return(id))
    return fromResource(data.data)
  },
}
