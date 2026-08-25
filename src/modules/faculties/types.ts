// Types for the Faculties module.
// These are the camelCase shapes the UI works with — the API layer maps them
// to/from the backend's snake_case wire format.

export type FacultyStatus = 'Active' | 'Inactive'

export interface Faculty {
  id: number
  code: string
  nameAR: string
  nameEN: string
  status: FacultyStatus
  /** Number of programs attached to this faculty, derived from the API's `programs` relation. */
  programsCount: number
}

/** The subset of a faculty that the create/edit dialog can submit. */
export type FacultyInput = Pick<Faculty, 'code' | 'nameAR' | 'nameEN' | 'status'>
