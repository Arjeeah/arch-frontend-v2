// Types for the Document Types module.
// These are the camelCase shapes the UI works with — the API layer maps them
// to/from the backend's snake_case wire format.

export type DocumentTypeStatus = 'active' | 'inactive'

/** One comparison inside a `requirementConditions` group. */
export type ConditionOperator = '=' | '!=' | 'in' | 'not_in' | '>' | '<' | '>=' | '<='

/**
 * `RequirementConditionService::EVALUABLE_FIELDS` — the closed list of student
 * columns a condition may test.
 *
 * The backend validates `requirement_conditions.conditions.*.field` with
 * `Rule::in(...)` against exactly these seven names, so anything else comes
 * back as a 422 quoting the wire path
 * (`The selected requirement_conditions.conditions.0.field is invalid.`).
 * They are raw column identifiers on both sides, so they are shown verbatim
 * rather than translated — the same treatment `ConditionOperator` labels get.
 */
export const CONDITION_FIELDS = [
  'nationality',
  'faculty_id',
  'program_id',
  'enrollment_year',
  'graduation_year',
  'student_status',
  'location_status',
] as const

export type ConditionField = (typeof CONDITION_FIELDS)[number]

/**
 * `field` stays a plain `string`, not `ConditionField`: rows stored before the
 * whitelist closed can name anything, and `UpdateDocumentTypeRequest` skips the
 * whitelist when the submitted conditions are byte-identical to the stored
 * ones — so an untouched legacy field has to survive a round trip intact.
 */
export interface RequirementCondition {
  field: string
  op: ConditionOperator
  /**
   * The request only validates `required` on this key (no type constraint),
   * so the backend accepts any JSON scalar/array here. The builder UI always
   * works with a plain string — `in` / `not_in` values are comma-separated
   * and split into an array on submit (see `toPayload`).
   */
  value: string
}

/** `requirement_conditions` JSON: `{ operator, conditions: [...] }`. */
export interface RequirementConditions {
  operator: 'AND' | 'OR'
  conditions: RequirementCondition[]
}

export interface DocumentType {
  /** UUID (`DocumentType` uses `HasUuids`) — not a numeric id. */
  id: string
  name: string
  description: string | null
  isRequired: boolean
  /** `null` when the column is null **or** holds JSON the builder cannot express. */
  requirementConditions: RequirementConditions | null
  /**
   * The column holds JSON that is not a `{ operator, conditions[] }` group.
   *
   * Seeded rows carry shapes like `{"applies_to":"international_students"}`
   * from before the builder existed; the column is a plain `array` cast, so
   * nothing server-side ever normalised them. They cannot be re-sent either —
   * `requirement_conditions.operator`/`.conditions` are `required_with`, so
   * echoing the stored value back is a 422. The dialog therefore leaves the
   * key out of the payload entirely, which preserves it.
   */
  hasUnsupportedConditions: boolean
  status: DocumentTypeStatus
  createdAt: string
  updatedAt: string
}

/**
 * The subset of a document type that the create/edit dialog can submit.
 *
 * `requirementConditions` is optional on purpose: omitting it omits
 * `requirement_conditions` from the request body, and an absent key leaves the
 * stored value untouched (`UpdateDocumentTypeRequest` only rules it
 * `nullable|array`). That is the one way to edit a row whose conditions the
 * builder cannot represent without destroying them.
 */
export type DocumentTypeInput = Pick<
  DocumentType,
  'name' | 'description' | 'isRequired' | 'status'
> & {
  requirementConditions?: RequirementConditions | null
}
