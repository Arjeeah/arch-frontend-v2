import { http } from '@/app/plugins/axios'
import type {
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
  field: string
  op: string
  value: unknown
}

/** Wire shape of `requirement_conditions` exactly as `DocumentType::$casts` stores it. */
interface RequirementConditionsResource {
  operator: string
  conditions: RequirementConditionResource[]
}

/** A document type exactly as `DocumentTypeResource` sends it (snake_case). */
interface DocumentTypeResource {
  id: string
  name: string
  description: string | null
  is_required: boolean
  requirement_conditions: RequirementConditionsResource | null
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

function toStatus(raw: string): DocumentTypeStatus {
  return raw === 'inactive' ? 'inactive' : 'active'
}

/** `requirement_conditions.conditions.*.op` is a fixed enum; anything else falls back to `'='`. */
const CONDITION_OPS = ['=', '!=', 'in', 'not_in', '>', '<', '>=', '<='] as const

function toConditions(
  resource: RequirementConditionsResource | null,
): RequirementConditions | null {
  if (!resource) return null
  return {
    operator: resource.operator === 'OR' ? 'OR' : 'AND',
    conditions: resource.conditions.map((condition) => ({
      field: condition.field,
      op: (CONDITION_OPS as readonly string[]).includes(condition.op)
        ? (condition.op as RequirementConditions['conditions'][number]['op'])
        : '=',
      // `value` is untyped on the wire (any JSON scalar or array). Render it
      // as a string; `in`/`not_in` arrays are joined for the comma-separated
      // builder input, everything else is stringified as-is.
      value: Array.isArray(condition.value) ? condition.value.join(', ') : String(condition.value),
    })),
  }
}

function fromConditionsInput(
  input: RequirementConditions | null,
): RequirementConditionsResource | null {
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
    status: toStatus(resource.status),
    createdAt: resource.created_at,
    updatedAt: resource.updated_at,
  }
}

/** camelCase UI model -> snake_case request payload. */
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
    const { data } = await http.get<DocumentTypeListResponse>(BASE_PATH, { params })
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
