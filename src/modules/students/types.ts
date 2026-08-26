/**
 * Student domain types.
 *
 * The wire shape (snake_case) lives in `api/studentsApi.ts`; everything here is
 * the camelCase UI model the pages and components consume.
 */

/** `App\Enums\StudentStatus` — closed set, ordered as the backend declares it. */
export const STUDENT_STATUSES = [
  'draft',
  'active',
  'graduated',
  'transferred',
  'withdrawn',
] as const

export type StudentStatus = (typeof STUDENT_STATUSES)[number]

/** `App\Enums\LocationStatus` — where the paper file physically is. */
export const LOCATION_STATUSES = ['in_location', 'borrowed'] as const

export type LocationStatus = (typeof LOCATION_STATUSES)[number]

/** `App\Enums\FileStatus` — completeness of one scanned document. */
export const FILE_STATUSES = ['complete', 'incomplete', 'draft'] as const

export type FileStatus = (typeof FILE_STATUSES)[number]

/** Bilingual academic entity (faculty or program) as embedded in a student. */
export interface AcademicRef {
  id: number
  code: string
  nameAr: string
  nameEn: string
}

/** Drawer the student's paper file is filed in. */
export interface DrawerRef {
  id: string
  /** `DrawerResource` sends the cabinet under a capitalised `Cabinet` key. */
  cabinetName: string
  number: number | null
  label: string | null
}

/** One document attached to a student, as embedded in `GET /v1/students/{id}`. */
export interface StudentDocumentSummary {
  id: string
  fileNumber: string
  fileStatus: FileStatus
  documentTypeId: string | null
  documentTypeName: string | null
  fileUrl: string | null
  fileName: string | null
  notes: string | null
  submittedAt: string | null
  createdAt: string | null
}

export interface Student {
  id: string
  studentNumber: string
  name: string
  nationality: string
  email: string | null
  phone: string | null
  facultyId: number | null
  faculty: AcademicRef | null
  programId: number | null
  program: AcademicRef | null
  drawerId: string | null
  drawer: DrawerRef | null
  enrollmentYear: number | null
  graduationYear: number | null
  studentStatus: StudentStatus
  locationStatus: LocationStatus
  /** Only populated by `show` — the index endpoint does not eager-load documents. */
  documents: StudentDocumentSummary[]
  createdAt: string | null
  updatedAt: string | null
}

/** Everything the create/edit form collects. */
export interface StudentInput {
  studentNumber: string
  name: string
  nationality: string
  email: string | null
  phone: string | null
  facultyId: number | null
  programId: number | null
  drawerId: string | null
  enrollmentYear: number | null
  graduationYear: number | null
  studentStatus: StudentStatus
  locationStatus: LocationStatus
}

/**
 * `show` returns the student plus a sibling `required_document_types` map,
 * computed from each document type's requirement conditions.
 */
export interface StudentDetail {
  student: Student
  requiredDocumentTypes: Array<{ id: string; name: string }>
}

/** `{ value, label }` pair for `AppSelect` / `AppAsyncSelect`. */
export interface LookupOption {
  value: string
  label: string
}

/** `DocumentPipelineStatusResource` — the AI pipeline's view of one document. */
export interface PipelineSnapshot {
  documentId: string
  status: string
  /** Arabic label the backend renders from the enum — display it as-is. */
  statusLabel: string
  error: string | null
  hasOcrContent: boolean
  pageCount: number
  hasRefinement: boolean
  /**
   * `DocumentRefinement::confidence_score`, already a 0–100 percentage —
   * `RefinementData::fromArray` rescales the model's 0.0–1.0 answer before it
   * is stored. Null before the AI has run.
   */
  confidenceScore: number | null
  isVerified: boolean
  verifiedBy: string | null
  verifiedAt: string | null
}

/** A student the AI created from a scan and nobody has confirmed yet. */
export function isDraftStudent(student: Pick<Student, 'studentStatus'>): boolean {
  return student.studentStatus === 'draft'
}

/** Picks the faculty/program name matching the active locale, with a fallback. */
export function academicLabel(ref: AcademicRef | null, locale: string): string {
  if (!ref) return ''
  const preferred = locale.startsWith('ar') ? ref.nameAr : ref.nameEn
  return preferred || ref.nameEn || ref.nameAr || ref.code
}

/** Human-readable drawer location, e.g. "Cabinet A · Drawer 2". */
export function drawerLabel(drawer: DrawerRef | null): string {
  if (!drawer) return ''
  const slot = drawer.label || (drawer.number !== null ? `#${drawer.number}` : '')
  return [drawer.cabinetName, slot].filter(Boolean).join(' · ')
}
