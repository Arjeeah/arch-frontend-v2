/**
 * Review queue — the human-verification workbench for AI-extracted document
 * identities. Every row here is one scanned document whose refinement has not
 * been verified yet; verifying it produces the ground-truth pair (AI answer vs
 * human answer) the model evaluation is built on.
 */

/** The six identity fields the reviewer can correct, plus the free-form bag. */
export interface RefinementIdentity {
  studentNumber: string
  studentName: string
  college: string
  program: string
  documentType: string
  enrollmentDate: string
  /**
   * Anything the extractor found that does not fit a named field. Values are
   * arbitrary JSON, so they stay `unknown` and are rendered/edited as text.
   */
  additionalFields: Record<string, unknown>
}

/** Identity plus the extractor's own confidence in it (0–100). */
export interface RefinementSnapshot extends RefinementIdentity {
  confidence: number | null
}

/** One row of `GET /v1/pipeline/review-queue`. */
export interface ReviewQueueItem {
  /** `student_documents.id` (UUID) — what the document routes are keyed by. */
  documentId: string
  /**
   * `document_refinements.id` (UUID) — what `PATCH /v1/refinements/{id}` is
   * keyed by. See the note on `refinement_id` in `api/reviewApi.ts`: the
   * current backend resource does not send it, so this may fall back to
   * `documentId`.
   */
  refinementId: string
  fileNumber: string | null
  fileName: string | null
  /** Absolute media URL, or `null` when the document has no stored file. */
  fileUrl: string | null
  pipelineStatus: string
  /** Arabic label straight from the backend enum — display it as-is. */
  pipelineStatusLabel: string
  /** 0–100. Null when the refinement never produced a score. */
  confidenceScore: number | null
  /** What the AI extracted. Null when the refinement row is missing. */
  structuredData: RefinementSnapshot | null
  /** What a human confirmed. Null until this row is verified. */
  verifiedData: RefinementSnapshot | null
  /** Name of the verifying user, not their id. */
  verifiedBy: string | null
  verifiedAt: string | null
  createdAt: string | null
}

/** Result of `POST /v1/refinements/{id}/verify` (accept the AI answer as-is). */
export interface VerificationResult {
  verifiedBy: string | null
  verifiedAt: string | null
}

/** Result of `PATCH /v1/refinements/{id}` (accept with corrections). */
export interface CorrectionResult extends VerificationResult {
  verifiedData: RefinementSnapshot | null
}

/** A `{ value, label }` pair for the college / document-type selects. */
export interface LookupOption {
  value: string
  label: string
}

/** One field's before/after, for the AI-vs-human diff panel. */
export interface IdentityDiffEntry {
  /** Key inside `RefinementIdentity`, used to look up the i18n label. */
  field: keyof RefinementIdentity
  aiValue: string
  humanValue: string
  changed: boolean
}

/**
 * Score at or above which the pipeline treats an extraction as trustworthy —
 * mirrors `config('ai.pipeline.confidence_threshold', 85)` on the backend.
 */
export const CONFIDENCE_THRESHOLD = 85

/** Below this the extraction is treated as a likely miss rather than a wobble. */
export const CONFIDENCE_CRITICAL = 60

/** The identity fields shown as plain rows, in reading order. */
export const IDENTITY_FIELDS = [
  'studentNumber',
  'studentName',
  'college',
  'program',
  'documentType',
  'enrollmentDate',
] as const satisfies ReadonlyArray<keyof RefinementIdentity>

/** Empty identity used when a row arrives with no refinement data at all. */
export function emptyIdentity(): RefinementIdentity {
  return {
    studentNumber: '',
    studentName: '',
    college: '',
    program: '',
    documentType: '',
    enrollmentDate: '',
    additionalFields: {},
  }
}
