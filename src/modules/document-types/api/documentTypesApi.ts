import { http } from '@/app/plugins/axios'
import type {
  ConditionOperator,
  DocumentType,
  DocumentTypeInput,
  DocumentTypeStatus,
  RequirementConditions,
} from '../types'

/**
 * `document-types` has no shared `API_ENDPOINTS` entry (that file lives in
 * `src/app/config/`, outside this module's territory), so the base path is
 * declared here — same approach as the `audit` module.
 */
const BASE_PATH = '/v1/document-types'

/** Wire shape of one condition inside `requirement_conditions.conditions`. */
interface RequirementConditionResource {
  field?: unknown
  op?: unknown
  value?: unknown
}

/** The `{ operator, conditions[] }` group the builder — and the API — expect. */
interface RequirementConditionsResource {
  operator?: unknown
  conditions: RequirementConditionResource[]
}

/**
 * A document type exactly as `DocumentTypeResource` sends it (snake_case).
 *
 * `requirement_conditions` is typed `unknown` rather than a group, because the
 * column is a bare `array` cast with no server-side normalisation: seeded rows
 * hold `{"applies_to":"international_students"}`, which has no `conditions`
 * array at all. Typing it as a group made `resource.conditions.map(...)` in the
 * mapper below a `TypeError` on those rows, and one such row took the whole
 * list page down with it.
 */
interface DocumentTypeResource {
  id: string
  name: string
  description: string | null
  is_required: boolean
  requirement_conditions: unknown
  status: string
  created_at: string
  updated_at: string
}

/** `show` / `store` / `update` responses are wrapped in a single `data` key. */
interface DocumentTypeItemResponse {
  data: DocumentTypeResource
}

/** `index` is paginated: `{ data: [...], meta, links }`. */
interface DocumentTypeListResponse {
  data: DocumentTypeResource[]
  meta?: { last_page?: number; current_page?: number; total?: number }
}

export interface DocumentTypeListParams {
  page?: number
  per_page?: number
  /** Partial match on `name` (`AllowedFilter::partial`). */
  name?: string
  status?: DocumentTypeStatus
  /** `AllowedFilter::exact('is_required')` — send `'1'` / `'0'`. */
  is_required?: '1' | '0'
}

/**
 * Spatie QueryBuilder only reads filters out of a nested `filter` query
 * parameter — `?filter[name]=x`, never a bare `?name=x`, which it silently
 * ignores (`config/query-builder.php` sets `parameters.filter => 'filter'`,
 * and the backend's own tests hit
 * `/api/v1/document-types?filter[status]=active`).
 *
 * The nesting lives here rather than at the call site so the page can keep
 * handing `useServerTable` plain `{ name, status, is_required }` filters —
 * `setFilters` merges per key, which a pre-nested `filter` object would break
 * by replacing the whole group on every change. Axios serialises the nested
 * object back into `filter[name]=x` on the wire.
 */
function toQuery({ page, per_page, ...filters }: DocumentTypeListParams): Record<string, unknown> {
  const filter: Record<string, string> = {}
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') filter[key] = String(value)
  }
  return Object.keys(filter).length > 0 ? { page, per_page, filter } : { page, per_page }
}

function toStatus(raw: string): DocumentTypeStatus {
  return raw === 'inactive' ? 'inactive' : 'active'
}

/** `requirement_conditions.conditions.*.op` is a fixed enum; anything else falls back to `'='`. */
const CONDITION_OPS = ['=', '!=', 'in', 'not_in', '>', '<', '>=', '<='] as const

/**
 * Whether the stored JSON is a group the builder can render and re-submit.
 *
 * Only the `conditions` array is required to be present: `operator` defaults to
 * `AND` server-side too (`RequirementConditionService::evaluate`).
 */
function isConditionGroup(value: unknown): value is RequirementConditionsResource {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  return Array.isArray((value as { conditions?: unknown }).conditions)
}

/** A JSON scalar or array rendered for the builder's single-line text input. */
function toConditionValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  // `in`/`not_in` arrive as arrays; join them for the comma-separated input.
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function toConditions(value: unknown): RequirementConditions | null {
  if (!isConditionGroup(value)) return null
  return {
    operator: value.operator === 'OR' ? 'OR' : 'AND',
    // A row that is not an object cannot carry a field/op/value at all; drop it
    // rather than emitting `{ field: undefined }` and rendering blank inputs the
    // backend would then reject as `required`.
    conditions: value.conditions
      .filter(
        (condition): condition is RequirementConditionResource =>
          typeof condition === 'object' && condition !== null && !Array.isArray(condition),
      )
      .map((condition) => ({
        field: typeof condition.field === 'string' ? condition.field : '',
        op: (CONDITION_OPS as readonly string[]).includes(String(condition.op))
          ? (String(condition.op) as RequirementConditions['conditions'][number]['op'])
          : '=',
        value: toConditionValue(condition.value),
      })),
  }
}

/**
 * `requirement_conditions` as the request body wants it back: `value` is a
 * plain string except for `in`/`not_in`, which the backend compares with
 * `in_array`, so those go out as a real JSON array.
 */
interface RequirementConditionsPayload {
  operator: 'AND' | 'OR'
  conditions: Array<{ field: string; op: ConditionOperator; value: string | string[] }>
}

function fromConditionsInput(
  input: RequirementConditions | null,
): RequirementConditionsPayload | null {
  if (!input || input.conditions.length === 0) return null
  return {
    operator: input.operator,
    conditions: input.conditions.map((condition) => ({
      field: condition.field,
      op: condition.op,
      value:
        condition.op === 'in' || condition.op === 'not_in'
          ? condition.value
              .split(',')
              .map((part) => part.trim())
              .filter(Boolean)
          : condition.value,
    })),
  }
}

/** snake_case wire format -> camelCase UI model. */
function fromResource(resource: DocumentTypeResource): DocumentType {
  return {
    id: resource.id,
    name: resource.name,
    description: resource.description,
    isRequired: resource.is_required,
    requirementConditions: toConditions(resource.requirement_conditions),
    hasUnsupportedConditions:
      resource.requirement_conditions != null && !isConditionGroup(resource.requirement_conditions),
    status: toStatus(resource.status),
    createdAt: resource.created_at,
    updatedAt: resource.updated_at,
  }
}

/**
 * camelCase UI model -> snake_case request payload.
 *
 * `requirement_conditions` is only written when the caller actually passed the
 * key. Leaving it out is what preserves a stored rule the builder cannot
 * express — echoing such a value back is a 422, and sending `null` would erase
 * it (verified against the live API on a `{"applies_to":…}` row).
 */
function toPayload(input: Partial<DocumentTypeInput>): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  if (input.name !== undefined) payload.name = input.name
  if (input.description !== undefined) payload.description = input.description
  if (input.isRequired !== undefined) payload.is_required = input.isRequired
  if (input.requirementConditions !== undefined) {
    payload.requirement_conditions = fromConditionsInput(input.requirementConditions)
  }
  if (input.status !== undefined) payload.status = input.status
  return payload
}

export const documentTypesApi = {
  /** Returns one page of document types (Laravel pagination via Spatie QueryBuilder). */
  list: async (
    params: DocumentTypeListParams,
  ): Promise<{ data: DocumentType[]; meta: DocumentTypeListResponse['meta'] }> => {
    const { data } = await http.get<DocumentTypeListResponse>(BASE_PATH, {
      params: toQuery(params),
    })
    return { data: data.data.map(fromResource), meta: data.meta }
  },

  show: async (id: string): Promise<DocumentType> => {
    const { data } = await http.get<DocumentTypeItemResponse>(`${BASE_PATH}/${id}`)
    return fromResource(data.data)
  },

  create: async (input: DocumentTypeInput): Promise<DocumentType> => {
    const { data } = await http.post<DocumentTypeItemResponse>(BASE_PATH, toPayload(input))
    return fromResource(data.data)
  },

  update: async (id: string, input: Partial<DocumentTypeInput>): Promise<DocumentType> => {
    const { data } = await http.put<DocumentTypeItemResponse>(
      `${BASE_PATH}/${id}`,
      toPayload(input),
    )
    return fromResource(data.data)
  },

  /**
   * The backend refuses this (422, `Cannot delete document type with
   * existing documents`) when `studentDocuments()` is non-empty — surface
   * whatever `getApiErrorMessage` extracts from the response, same as any
   * other mutation failure.
   */
  delete: async (id: string): Promise<void> => {
    await http.delete(`${BASE_PATH}/${id}`)
  },
}
