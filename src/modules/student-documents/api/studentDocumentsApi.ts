import { http } from '@/app/plugins/axios'
import type { ServerTableParams, ServerTableResponse } from '@/shared/composables/useServerTable'
import {
  FILE_STATUSES,
  type FileStatus,
  type StudentDocument,
  type StudentDocumentInput,
} from '../types'

const DOCUMENTS_URL = '/v1/student-documents'

/** `App\Http\Resources\StudentResource`, trimmed to what this module renders. */
interface StudentResource {
  id: string
  name: string | null
  student_number: string | null
}

/** `App\Http\Resources\DocumentTypeResource`, trimmed likewise. */
interface DocumentTypeResource {
  id: string
  name: string | null
}

/** `App\Http\Resources\StudentDocumentResource`. */
interface StudentDocumentResource {
  id: string
  student_id: string
  student?: StudentResource | null
  document_type_id: string | null
  document_type?: DocumentTypeResource | null
  file_number: string | null
  file_status: string | null
  notes: string | null
  submitted_at: string | null
  file_url?: string | null
  file_name?: string | null
  created_at: string | null
  updated_at: string | null
}

interface DocumentListResponse {
  data: StudentDocumentResource[]
  meta?: { current_page?: number; last_page?: number; total?: number }
}

interface DocumentItemResponse {
  data: StudentDocumentResource
}

function toFileStatus(raw: string | null): FileStatus {
  return FILE_STATUSES.find((status) => status === raw) ?? 'draft'
}

/** snake_case wire format -> camelCase UI model. */
function fromResource(resource: StudentDocumentResource): StudentDocument {
  return {
    id: resource.id,
    studentId: resource.student_id,
    student: resource.student
      ? {
          id: resource.student.id,
          name: resource.student.name ?? '',
          studentNumber: resource.student.student_number ?? '',
        }
      : null,
    documentTypeId: resource.document_type_id ?? null,
    documentType: resource.document_type
      ? { id: resource.document_type.id, name: resource.document_type.name ?? '' }
      : null,
    fileNumber: resource.file_number ?? '',
    fileStatus: toFileStatus(resource.file_status),
    notes: resource.notes ?? null,
    submittedAt: resource.submitted_at ?? null,
    // Media Library hands back an empty string when nothing is attached.
    fileUrl: resource.file_url ? resource.file_url : null,
    fileName: resource.file_name ?? null,
    createdAt: resource.created_at ?? null,
    updatedAt: resource.updated_at ?? null,
  }
}

/**
 * camelCase UI model -> snake_case request body.
 *
 * `file_number` is deliberately absent: `StudentDocumentController@store`
 * generates it and neither request rule accepts it. `temp_upload_id` is only
 * sent when a file was actually staged — sending `null` is legal but pointless,
 * and on update it would look like a no-op replace.
 */
function toPayload(input: Partial<StudentDocumentInput>): Record<string, unknown> {
  const payload: Record<string, unknown> = {}

  if (input.studentId !== undefined) payload.student_id = input.studentId
  if (input.documentTypeId !== undefined) payload.document_type_id = input.documentTypeId
  if (input.fileStatus !== undefined) payload.file_status = input.fileStatus
  if (input.notes !== undefined) payload.notes = input.notes?.trim() ? input.notes.trim() : null
  if (input.submittedAt !== undefined) payload.submitted_at = input.submittedAt || null
  if (input.tempUploadId) payload.temp_upload_id = input.tempUploadId

  return payload
}

/** Filters `StudentDocumentController@index` accepts, in Spatie QueryBuilder form. */
export interface DocumentListFilters extends Record<string, unknown> {
  'filter[file_number]'?: string
  'filter[student_id]'?: string
  'filter[document_type_id]'?: string
  'filter[file_status]'?: FileStatus | ''
  /** One of `file_number`, `file_status`, `submitted_at`, `created_at`. */
  sort?: string
}

export const studentDocumentsApi = {
  /**
   * One page of documents, shaped for `useServerTable`.
   *
   * The endpoint has no pipeline-status filter — `allowedFilters` covers
   * `file_number`, `student_id`, `document_type_id` and `file_status` only —
   * so "show me everything that failed OCR" is not expressible here; the
   * pipeline monitor owns that view. // verify against live API
   */
  list: async (params: ServerTableParams): Promise<ServerTableResponse<StudentDocument>> => {
    const { data } = await http.get<DocumentListResponse>(DOCUMENTS_URL, { params })
    return { data: data.data.map(fromResource), meta: data.meta ?? {} }
  },

  show: async (id: string): Promise<StudentDocument> => {
    const { data } = await http.get<DocumentItemResponse>(`${DOCUMENTS_URL}/${id}`)
    return fromResource(data.data)
  },

  /** Attaching `tempUploadId` is what dispatches the extraction pipeline. */
  create: async (input: StudentDocumentInput): Promise<StudentDocument> => {
    const { data } = await http.post<DocumentItemResponse>(DOCUMENTS_URL, toPayload(input))
    return fromResource(data.data)
  },

  /**
   * `UpdateStudentDocumentRequest` accepts only `file_status`, `notes`,
   * `submitted_at` and `temp_upload_id` — the student and document type are
   * fixed once a document exists.
   */
  update: async (
    id: string,
    input: Partial<
      Pick<StudentDocumentInput, 'fileStatus' | 'notes' | 'submittedAt' | 'tempUploadId'>
    >,
  ): Promise<StudentDocument> => {
    const { data } = await http.put<DocumentItemResponse>(
      `${DOCUMENTS_URL}/${id}`,
      toPayload(input),
    )
    return fromResource(data.data)
  },

  delete: async (id: string): Promise<void> => {
    await http.delete(`${DOCUMENTS_URL}/${id}`)
  },
}
