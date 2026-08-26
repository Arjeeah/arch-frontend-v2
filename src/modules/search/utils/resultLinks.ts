/**
 * Where a search hit sends the user.
 *
 * Both destinations belong to the students / student-documents modules (stream
 * S4) — this module only links at them. The paths are centralised here so the
 * integrator has one place to correct if S4 lands on different route names; see
 * WIRING.md ("Notes").
 */

/** Student detail — used whenever the hit resolved to a student. */
export function studentPath(studentId: string): string {
  return `/students/${studentId}`
}

/**
 * Document detail — the destination for a hit whose document is not attached to
 * a student yet (`student_id` is null on documents the pipeline has not linked).
 */
export function documentPath(studentDocumentId: string): string {
  return `/student-documents/${studentDocumentId}`
}
