import { http } from '@/app/plugins/axios'
import { API_ENDPOINTS } from '@/app/config/api'
import { BORROWING_STATUSES } from '../types'
import type {
  Borrowing,
  BorrowingCreateInput,
  BorrowingStatus,
  BorrowingUpdateInput,
} from '../types'
import type { ServerTableParams, ServerTableResponse } from '@/shared/composables/useServerTable'

/**
 * The archived document nested on a borrowing (snake_case).
 *
 * verify against live API: `StudentDocumentResource` has no `title` field —
 * `file_number` is the closest thing to a human label (an auto-generated
 * `DOC-YYYYMMDD-XXXXXXXX` code), with `file_name` (the uploaded filename) as
 * a fallback.
 */
interface StudentDocumentResource {
  id: string
  file_number?: string | null
  file_name?: string | null
}

/** The requesting user nested on a borrowing (snake_case). */
interface BorrowingUserResource {
  id: string
  name?: string | null
}

/** A borrowing exactly as the backend sends it (Laravel resource, snake_case). */
interface BorrowingResource {
  id: string
  status: string
  notes?: string | null
  admin_notes?: string | null
  rejection_reason?: string | null
  requested_at?: string | null
  due_date?: string | null
  borrowed_at?: string | null
  returned_at?: string | null
  created_at?: string | null
  /** Server-computed; see `Borrowing::isOverdue()` / `daysUntilDue()`. */
  is_overdue?: boolean | null
  days_until_due?: number | null
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
  meta?: { current_page?: number; last_page?: number; total?: number }
}

function toStatus(raw: string): BorrowingStatus {
  const value = raw.toLowerCase()
  return BORROWING_STATUSES.find((status) => status === value) ?? 'pending'
}

function documentTitle(document: StudentDocumentResource): string {
  return document.file_number || document.file_name || `#${document.id}`
}

/** snake_case wire format -> camelCase UI model. */
function fromResource(resource: BorrowingResource): Borrowing {
  const document = resource.student_document
  const user = resource.user
  return {
    id: resource.id,
    document: document ? { id: document.id, title: documentTitle(document) } : null,
    borrower: user ? { id: user.id, name: user.name ?? `#${user.id}` } : null,
    notes: resource.notes ?? '',
    status: toStatus(resource.status),
    requestedAt: resource.requested_at ?? null,
    dueDate: resource.due_date ?? null,
    borrowedAt: resource.borrowed_at ?? null,
    returnedAt: resource.returned_at ?? null,
    createdAt: resource.created_at ?? null,
    // Narrowed rather than coerced: `?? null` on a `false` would keep `false`,
    // but an unexpected string/number must NOT become a truthy "overdue".
    isOverdue: typeof resource.is_overdue === 'boolean' ? resource.is_overdue : null,
    daysUntilDue: typeof resource.days_until_due === 'number' ? resource.days_until_due : null,
    adminNotes: resource.admin_notes ?? null,
    rejectionReason: resource.rejection_reason ?? null,
  }
}

/** One document option for the create dialog's search-as-you-type picker. */
export interface DocumentOption {
  value: string
  label: string
}

interface DocumentLookupResponse {
  data: StudentDocumentResource[]
}

export const borrowingApi = {
  /**
   * One page of borrowings for `useServerTable`. Filters map to the
   * allowlisted `Spatie\QueryBuilder` filters on `BorrowingController::index`
   * (`filter[status|user_id|student_document_id|overdue]`).
   *
   * verify against live API: there is no free-text filter for borrowings
   * (no `AllowedFilter::partial` on this controller) — a search box can only
   * narrow what's already on the current page.
   */
  list: async (params: ServerTableParams): Promise<ServerTableResponse<Borrowing>> => {
    const { data } = await http.get<BorrowingListResponse>(API_ENDPOINTS.borrowings.list, {
      params,
    })
    return {
      data: data.data.map(fromResource),
      meta: data.meta ?? {},
    }
  },

  show: async (id: string): Promise<Borrowing> => {
    const { data } = await http.get<BorrowingItemResponse>(API_ENDPOINTS.borrowings.show(id))
    return fromResource(data.data)
  },

  create: async (input: BorrowingCreateInput): Promise<Borrowing> => {
    const payload: Record<string, string> = { student_document_id: input.studentDocumentId }
    if (input.notes.trim()) payload.notes = input.notes.trim()
    const { data } = await http.post<BorrowingItemResponse>(
      API_ENDPOINTS.borrowings.create,
      payload,
    )
    return fromResource(data.data)
  },

  /** Only `notes` can change after the request exists — see `BorrowingController::update`. */
  update: async (id: string, input: BorrowingUpdateInput): Promise<Borrowing> => {
    const { data } = await http.patch<BorrowingItemResponse>(API_ENDPOINTS.borrowings.update(id), {
      notes: input.notes.trim(),
    })
    return fromResource(data.data)
  },

  delete: async (id: string): Promise<void> => {
    await http.delete(API_ENDPOINTS.borrowings.delete(id))
  },

  /**
   * pending -> approved. `due_days` is left unset — the backend defaults it
   * from `BorrowingSettings.default_duration_days` (see `BorrowingService`).
   */
  approve: async (id: string): Promise<Borrowing> => {
    const { data } = await http.post<BorrowingItemResponse>(API_ENDPOINTS.borrowings.approve(id), {
      action: 'approve',
    })
    return fromResource(data.data)
  },

  /**
   * pending -> rejected. `rejection_reason` is `required_if:action,reject` on
   * `ApproveBorrowingRequest` — omitting it 422s.
   */
  reject: async (id: string, rejectionReason: string): Promise<Borrowing> => {
    const { data } = await http.post<BorrowingItemResponse>(API_ENDPOINTS.borrowings.approve(id), {
      action: 'reject',
      rejection_reason: rejectionReason,
    })
    return fromResource(data.data)
  },

  /** approved -> borrowed. */
  markBorrowed: async (id: string): Promise<Borrowing> => {
    const { data } = await http.post<BorrowingItemResponse>(
      API_ENDPOINTS.borrowings.markBorrowed(id),
    )
    return fromResource(data.data)
  },

  /** borrowed / approved / overdue -> returned. */
  markReturned: async (id: string): Promise<Borrowing> => {
    const { data } = await http.post<BorrowingItemResponse>(API_ENDPOINTS.borrowings.return(id))
    return fromResource(data.data)
  },

  /**
   * Document search for the create dialog's picker. `student_document_id` is
   * a UUID nobody can type by hand, so this hits `/v1/student-documents`
   * directly (an HTTP call, not a module import — student-documents belongs
   * to a different module) and searches the one partial filter it exposes,
   * `file_number`.
   *
   * verify against live API: `/v1/student-documents` is not in
   * `API_ENDPOINTS` (that file is outside this module's territory), so the
   * path is inlined here.
   */
  searchDocuments: async (query: string): Promise<DocumentOption[]> => {
    const { data } = await http.get<DocumentLookupResponse>('/v1/student-documents', {
      params: { filter: { file_number: query }, per_page: 10 },
    })
    return data.data.map((doc) => ({ value: doc.id, label: documentTitle(doc) }))
  },
}
