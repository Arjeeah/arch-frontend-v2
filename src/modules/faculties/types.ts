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
   * Number of programs attached to this faculty, or `null` when the backend
   * did not tell us.
   *
   * verify against live API: `FacultyResource` never serialises a `programs`
   * relation or a count, so this is `null` for every row today. It is
   * deliberately NOT `0` — a hard zero renders as "this faculty has no
   * programs", which is a claim the API never made and which is false for
   * every seeded faculty. `null` renders as an em dash instead.
   * See `facultiesApi.ts`.
   */
  programsCount: number | null
}

/** The subset of a faculty that the create/edit dialog can submit. */
export type FacultyInput = Pick<Faculty, 'code' | 'nameAR' | 'nameEN' | 'status'>
