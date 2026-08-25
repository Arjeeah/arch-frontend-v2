import { http } from '@/app/plugins/axios'
import type { ServerTableParams, ServerTableResponse } from '@/shared/composables/useServerTable'
import {
  FILE_STATUSES,
  LOCATION_STATUSES,
  STUDENT_STATUSES,
  type AcademicRef,
  type DrawerRef,
  type FileStatus,
  type LocationStatus,
  type Student,
  type StudentDetail,
  type StudentDocumentSummary,
  type StudentInput,
  type StudentStatus,
} from '../types'

/**
 * Endpoints this module talks to. Declared here rather than in
 * `src/app/config/api.ts` so the module owns its own wire surface.
 */
const STUDENTS_URL = '/v1/students'

/** `App\Http\Resources\FacultyResource` / `ProgramResource`. */
interface AcademicResource {
  id: number
  code: string | null
  name_ar: string | null
  name_en: string | null
  status?: string
}

/** `App\Http\Resources\DrawerResource` — note the capitalised `Cabinet` key. */
interface DrawerResource {
  id: string
  Cabinet?: string | null
  number?: number | null
  label?: string | null
}

/** `App\Http\Resources\StudentDocumentResource`. */
interface StudentDocumentResource {
  id: string
  student_id: string
  document_type_id: string | null
  document_type?: { id: string; name: string } | null
  file_number: string | null
  file_status: string | null
  notes: string | null
  submitted_at: string | null
  file_url?: string | null
  file_name?: string | null
  created_at: string | null
  updated_at: string | null
}

/** `App\Http\Resources\StudentResource`. */
interface StudentResource {
  id: string
  student_number: string | null
  name: string | null
  nationality: string | null
  email: string | null
  phone: string | null
  faculty_id: number | null
  faculty?: AcademicResource | null
  program_id: number | null
  program?: AcademicResource | null
  drawer_id: string | null
  drawer?: DrawerResource | null
  enrollment_year: number | null
  graduation_year: number | null
  student_status: string | null
  location_status: string | null
  documents?: StudentDocumentResource[]
  created_at: string | null
  updated_at: string | null
}

interface StudentListResponse {
  data: StudentResource[]
  meta?: { current_page?: number; last_page?: number; total?: number }
}

/**
 * `show` wraps the student in `data` and hangs the computed requirement list
 * off the envelope root (`StudentController@show` uses `->additional(...)`).
 * The map is `{ "<document-type-uuid>": "<name>" }`.
 */
interface StudentDetailResponse {
  data: StudentResource
  required_document_types?: Record<string, string>
}

interface StudentItemResponse {
  data: StudentResource
}

function toStudentStatus(raw: string | null): StudentStatus {
  const match = STUDENT_STATUSES.find((status) => status === raw)
  // A value outside the enum can only mean the backend added a case; treat it
  // as `active` rather than `draft`, so an unknown status never renders the
  // "needs confirming" badge on a student nobody has to confirm.
  return match ?? 'active'
}

function toLocationStatus(raw: string | null): LocationStatus {
  return LOCATION_STATUSES.find((status) => status === raw) ?? 'in_location'
}

function toFileStatus(raw: string | null): FileStatus {
  return FILE_STATUSES.find((status) => status === raw) ?? 'draft'
}

function fromAcademic(resource: AcademicResource | null | undefined): AcademicRef | null {
  if (!resource) return null
  return {
    id: resource.id,
    code: resource.code ?? '',
    nameAr: resource.name_ar ?? '',
    nameEn: resource.name_en ?? '',
  }
}

function fromDrawer(resource: DrawerResource | null | undefined): DrawerRef | null {
  if (!resource) return null
  return {
    id: resource.id,
    cabinetName: resource.Cabinet ?? '',
    number: resource.number ?? null,
    label: resource.label ?? null,
  }
}

function fromDocument(resource: StudentDocumentResource): StudentDocumentSummary {
  return {
    id: resource.id,
    fileNumber: resource.file_number ?? '',
    fileStatus: toFileStatus(resource.file_status),
    documentTypeId: resource.document_type_id ?? null,
    documentTypeName: resource.document_type?.name ?? null,
    // Media Library returns an empty string when the collection is empty.
    fileUrl: resource.file_url ? resource.file_url : null,
    fileName: resource.file_name ?? null,
    notes: resource.notes ?? null,
    submittedAt: resource.submitted_at ?? null,
    createdAt: resource.created_at ?? null,
  }
}

/** snake_case wire format -> camelCase UI model. */
function fromResource(resource: StudentResource): Student {
  return {
    id: resource.id,
    studentNumber: resource.student_number ?? '',
    name: resource.name ?? '',
    nationality: resource.nationality ?? '',
    email: resource.email ?? null,
    phone: resource.phone ?? null,
    facultyId: resource.faculty_id ?? null,
    faculty: fromAcademic(resource.faculty),
    programId: resource.program_id ?? null,
    program: fromAcademic(resource.program),
    drawerId: resource.drawer_id ?? null,
    drawer: fromDrawer(resource.drawer),
    enrollmentYear: resource.enrollment_year ?? null,
    graduationYear: resource.graduation_year ?? null,
    studentStatus: toStudentStatus(resource.student_status),
    locationStatus: toLocationStatus(resource.location_status),
    documents: (resource.documents ?? []).map(fromDocument),
    createdAt: resource.created_at ?? null,
    updatedAt: resource.updated_at ?? null,
  }
}

/**
 * camelCase UI model -> snake_case request body.
 *
 * Only keys present on `input` are sent, which is what `UpdateStudentRequest`
 * wants (every rule is `sometimes`). Optional text fields normalise `''` to
 * `null` so a cleared field clears server-side instead of failing the
 * `email` / `uuid` rules on an empty string.
 */
function toPayload(input: Partial<StudentInput>): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  const orNull = (value: string | null | undefined) => (value ? value : null)

  if (input.studentNumber !== undefined) payload.student_number = input.studentNumber.trim()
  if (input.name !== undefined) payload.name = input.name.trim()
  if (input.nationality !== undefined) payload.nationality = input.nationality.trim()
  if (input.email !== undefined) payload.email = orNull(input.email?.trim())
  if (input.phone !== undefined) payload.phone = orNull(input.phone?.trim())
  if (input.facultyId !== undefined) payload.faculty_id = input.facultyId
  if (input.programId !== undefined) payload.program_id = input.programId
  if (input.drawerId !== undefined) payload.drawer_id = orNull(input.drawerId)
  if (input.enrollmentYear !== undefined) payload.enrollment_year = input.enrollmentYear
  if (input.graduationYear !== undefined) payload.graduation_year = input.graduationYear
  if (input.studentStatus !== undefined) payload.student_status = input.studentStatus
  if (input.locationStatus !== undefined) payload.location_status = input.locationStatus

  return payload
}

/** Filters `StudentController@index` accepts, in Spatie QueryBuilder form. */
export interface StudentListFilters extends Record<string, unknown> {
  'filter[name]'?: string
  'filter[student_number]'?: string
  'filter[faculty_id]'?: number | string
  'filter[program_id]'?: number | string
  'filter[student_status]'?: StudentStatus | ''
  'filter[location_status]'?: LocationStatus | ''
  /** One of `name`, `student_number`, `enrollment_year`, `created_at` (prefix `-` to reverse). */
  sort?: string
}

export const studentsApi = {
  /**
   * One page of students, shaped for `useServerTable`. `params` carries the
   * `filter[...]` keys plus `page` / `per_page`; axios drops `undefined`
   * values, so a cleared filter simply stops being sent.
   */
  list: async (params: ServerTableParams): Promise<ServerTableResponse<Student>> => {
    const { data } = await http.get<StudentListResponse>(STUDENTS_URL, { params })
    return { data: data.data.map(fromResource), meta: data.meta ?? {} }
  },

  /** The student plus the document types its faculty/program combination requires. */
  show: async (id: string): Promise<StudentDetail> => {
    const { data } = await http.get<StudentDetailResponse>(`${STUDENTS_URL}/${id}`)
    return {
      student: fromResource(data.data),
      requiredDocumentTypes: Object.entries(data.required_document_types ?? {}).map(
        ([typeId, name]) => ({ id: typeId, name }),
      ),
    }
  },

  create: async (input: StudentInput): Promise<Student> => {
    const { data } = await http.post<StudentItemResponse>(STUDENTS_URL, toPayload(input))
    return fromResource(data.data)
  },

  update: async (id: string, input: Partial<StudentInput>): Promise<Student> => {
    const { data } = await http.put<StudentItemResponse>(`${STUDENTS_URL}/${id}`, toPayload(input))
    return fromResource(data.data)
  },

  delete: async (id: string): Promise<void> => {
    await http.delete(`${STUDENTS_URL}/${id}`)
  },
}
