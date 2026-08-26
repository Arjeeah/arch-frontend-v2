// Types for the Document Types module.
// These are the camelCase shapes the UI works with — the API layer maps them
// to/from the backend's snake_case wire format.

export type DocumentTypeStatus = 'active' | 'inactive'

/** One comparison inside a `requirementConditions` group. */
export type ConditionOperator = '=' | '!=' | 'in' | 'not_in' | '>' | '<' | '>=' | '<='

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
  requirementConditions: RequirementConditions | null
  status: DocumentTypeStatus
  createdAt: string
  updatedAt: string
}

/** The subset of a document type that the create/edit dialog can submit. */
export type DocumentTypeInput = Pick<
  DocumentType,
  'name' | 'description' | 'isRequired' | 'requirementConditions' | 'status'
>
