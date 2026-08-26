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
   * Verified against the running API: `FacultyResource` emits exactly
   * `id, code, name_ar, name_en, status, created_at, updated_at` — no `programs`
   * relation and no count, on index, show, store, update or restore. So this is
   * `null` for every row today. It is deliberately NOT `0` — a hard zero renders
   * as "this faculty has no programs", a claim the API never made and one that
   * is false for most seeded faculties (18 programs across 9 faculties).
   * `null` renders as an em dash instead. See `facultiesApi.ts`.
   */
  programsCount: number | null
}

/** The subset of a faculty that the create/edit dialog can submit. */
export type FacultyInput = Pick<Faculty, 'code' | 'nameAR' | 'nameEN' | 'status'>
