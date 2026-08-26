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
  /**
   * Number of programs attached to this faculty.
   *
   * verify against live API: `FacultyResource` never serialises a `programs`
   * relation, so there is nothing to derive this from today — always `0`
   * until the backend adds a count. See `facultiesApi.ts`.
   */
  programsCount: number
}

/** The subset of a faculty that the create/edit dialog can submit. */
export type FacultyInput = Pick<Faculty, 'code' | 'nameAR' | 'nameEN' | 'status'>
