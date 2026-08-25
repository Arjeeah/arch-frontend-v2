// Types for the Programs module.
// These are the camelCase shapes the UI works with — the API layer maps them
// to/from the backend's snake_case wire format.

export type ProgramStatus = 'active' | 'inactive'

/**
 * The faculty a program belongs to, as embedded on `ProgramResource` via
 * `whenLoaded('faculty')`. `index` always eager-loads it; `store`/`update`
 * responses may omit the key entirely when the relation was not reloaded —
 * see `fromResource` in the api file.
 */
export interface ProgramFacultySummary {
  id: number
  code: string
  nameAr: string
  nameEn: string
}

export interface Program {
  id: number
  facultyId: number
  faculty: ProgramFacultySummary | null
  code: string
  nameAr: string
  nameEn: string
  status: ProgramStatus
  createdAt: string
  updatedAt: string
}

/** The subset of a program that the create/edit dialog can submit. */
export interface ProgramInput {
  facultyId: number
  code: string
  nameAr: string
  nameEn: string
  status: ProgramStatus
}
