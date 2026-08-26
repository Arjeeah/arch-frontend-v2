// Types for the Search module.
// These are the camelCase shapes the UI works with — `api/searchApi.ts` maps
// them to/from the backend's snake_case wire format.

/**
 * Which engine answered the search.
 *
 * `semantic` is pgvector cosine similarity over document embeddings (the happy
 * path). `keyword` means the semantic search threw and `HybridSearchService`
 * fell back to a PostgreSQL `tsvector` query — recall drops sharply, so the UI
 * has to say so loudly.
 */
export type SearchMode = 'semantic' | 'keyword'

/** `App\Enums\StudentStatus` — the values the `student_status` filter accepts. */
export const STUDENT_STATUSES = [
  'draft',
  'active',
  'graduated',
  'transferred',
  'withdrawn',
] as const

export type StudentStatus = (typeof STUDENT_STATUSES)[number]

/** One matching page of one document. */
export interface SearchResult {
  /** `document_contents.id` — unique per page, the row key. A UUID. */
  contentId: string
  /** `student_documents.id` — a UUID (`StudentDocument` uses `HasUuids`). */
  studentDocumentId: string
  /** Matching text, already truncated to 200 chars by the backend. */
  content: string
  pageNumber: number | null
  fileNumber: string | null
  /**
   * `students.id` — a UUID. Null when the document is not attached to a
   * student yet.
   */
  studentId: string | null
  studentName: string | null
  studentNumber: string | null
  /** Arabic faculty name (`faculties.name_ar`). */
  facultyName: string | null
  /** Arabic program name (`programs.name_ar`). */
  programName: string | null
  /**
   * `1 - cosine_distance` in semantic mode (0..1, higher is better) or
   * `ts_rank` in keyword mode — where the number is a relevance rank on an
   * open scale, NOT a percentage. `SearchModeBadge` / `SimilarityBar` label it
   * differently per mode for that reason.
   */
  similarityScore: number
}

/** The `meta` block the search endpoint attaches next to `data`. */
export interface SearchMeta {
  mode: SearchMode
  /** Echo of the query the backend actually ran. */
  query: string
  totalResults: number
  /** Exception message that forced the keyword fallback; null in semantic mode. */
  fallbackReason: string | null
}

export interface SearchResponse {
  results: SearchResult[]
  meta: SearchMeta
}

/** Optional narrowing sent as `filters` in the request body. */
export interface SearchFilters {
  facultyId: number | null
  programId: number | null
  studentStatus: StudentStatus | null
}

export interface SearchQueryInput {
  query: string
  /** Backend caps this at 100 and defaults to 20 when omitted. */
  limit?: number
  filters?: SearchFilters
}

/**
 * Hits collapsed by document: the API returns one row per matching *page*, and
 * a single file can match many times over. Grouping keeps a 40-page student
 * file from burying every other result.
 */
export interface SearchResultGroup {
  studentDocumentId: string
  fileNumber: string | null
  studentId: string | null
  studentName: string | null
  studentNumber: string | null
  facultyName: string | null
  programName: string | null
  /** Best score in the group — what the group list is ordered by. */
  topScore: number
  hits: SearchResult[]
}

/**
 * A faculty or program as the filter selects need it. Both names are carried so
 * the select can follow the UI locale without the api layer knowing about i18n.
 */
export interface LookupOption {
  id: number
  nameAr: string
  nameEn: string
  /** Programs only — lets the UI keep filtering client-side if needed. */
  facultyId?: number | null
}

/** Query validation bounds, mirrored from `SearchRequest::rules()`. */
export const QUERY_MIN_LENGTH = 2
export const QUERY_MAX_LENGTH = 500

/** Result-count choices offered in the UI; the backend allows 1..100. */
export const LIMIT_OPTIONS = [20, 50, 100] as const

export const DEFAULT_LIMIT = 20
