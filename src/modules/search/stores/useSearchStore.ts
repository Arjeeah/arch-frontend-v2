import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import { searchApi } from '../api/searchApi'
import {
  DEFAULT_LIMIT,
  QUERY_MAX_LENGTH,
  QUERY_MIN_LENGTH,
  type LookupOption,
  type SearchFilters,
  type SearchMeta,
  type SearchResult,
  type SearchResultGroup,
  type StudentStatus,
} from '../types'

/**
 * Collapses the flat, page-level hit list into one entry per document.
 *
 * The API returns a row per matching *page*, so one heavily-matching file can
 * fill the whole result set. Grouping keeps every distinct document visible and
 * shows its pages underneath. Input order is already best-first (both search
 * modes sort by score descending); the sort below only guards against that
 * changing server-side.
 */
function groupResults(results: SearchResult[]): SearchResultGroup[] {
  const groups = new Map<number, SearchResultGroup>()

  for (const result of results) {
    const existing = groups.get(result.studentDocumentId)

    if (existing) {
      existing.hits.push(result)
      existing.topScore = Math.max(existing.topScore, result.similarityScore)
      // Student/faculty columns come from the same joins on every row, but a
      // row whose joins resolved fills in blanks left by one whose did not.
      existing.studentId ??= result.studentId
      existing.studentName ??= result.studentName
      existing.studentNumber ??= result.studentNumber
      existing.facultyName ??= result.facultyName
      existing.programName ??= result.programName
      existing.fileNumber ??= result.fileNumber
      continue
    }

    groups.set(result.studentDocumentId, {
      studentDocumentId: result.studentDocumentId,
      fileNumber: result.fileNumber,
      studentId: result.studentId,
      studentName: result.studentName,
      studentNumber: result.studentNumber,
      facultyName: result.facultyName,
      programName: result.programName,
      topScore: result.similarityScore,
      hits: [result],
    })
  }

  return [...groups.values()].sort((a, b) => b.topScore - a.topScore)
}

export const useSearchStore = defineStore('search', () => {
  // ── Form state ───────────────────────────────────────────────────────────
  const query = ref('')
  const limit = ref<number>(DEFAULT_LIMIT)
  const filters = ref<SearchFilters>({ facultyId: null, programId: null, studentStatus: null })

  // ── Result state ─────────────────────────────────────────────────────────
  const results = ref<SearchResult[]>([])
  const meta = ref<SearchMeta | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  /** False until the first submit, so the page can show a prompt instead of "no results". */
  const hasSearched = ref(false)

  // ── Filter lookups ───────────────────────────────────────────────────────
  const faculties = ref<LookupOption[]>([])
  const programs = ref<LookupOption[]>([])
  const lookupsLoading = ref(false)
  /**
   * Set when a lookup request fails. Without it the selects would simply render
   * empty, which reads as "this archive has no faculties" rather than "the list
   * did not load" — the filter bar shows a retry instead.
   */
  const lookupsError = ref<string | null>(null)

  /** Discards responses from a slower request that a newer one has overtaken. */
  let requestId = 0

  /**
   * Same guard for the lookup calls. Switching faculty twice in quick succession
   * fires two `programs()` requests, and without this the slower one can land
   * last and leave the *previous* faculty's programs under the new selection —
   * pick one from that stale list and the search sends a `program_id` the
   * backend ANDs against the faculty, silently returning nothing.
   */
  let lookupId = 0

  const groups = computed<SearchResultGroup[]>(() => groupResults(results.value))

  const trimmedQuery = computed(() => query.value.trim())

  const isQueryValid = computed(
    () =>
      trimmedQuery.value.length >= QUERY_MIN_LENGTH &&
      trimmedQuery.value.length <= QUERY_MAX_LENGTH,
  )

  const isEmpty = computed(
    () => hasSearched.value && !loading.value && !error.value && results.value.length === 0,
  )

  /**
   * Runs the search. Returns `false` without touching the network when the
   * query is outside the bounds `SearchRequest` enforces — the page disables the
   * submit button on the same condition, this is the belt-and-braces half.
   */
  async function search(): Promise<boolean> {
    if (!isQueryValid.value) return false

    const currentRequest = ++requestId
    loading.value = true
    error.value = null
    hasSearched.value = true

    try {
      const response = await searchApi.search({
        query: trimmedQuery.value,
        limit: limit.value,
        filters: filters.value,
      })
      if (currentRequest !== requestId) return false

      results.value = response.results
      meta.value = response.meta
      return true
    } catch (err) {
      if (currentRequest !== requestId) return false
      results.value = []
      meta.value = null
      error.value = getApiErrorMessage(err, 'Search failed')
      throw err
    } finally {
      if (currentRequest === requestId) loading.value = false
    }
  }

  /** Loads the faculty list, and the programs for whichever faculty is selected. */
  async function loadLookups(): Promise<void> {
    const currentLookup = ++lookupId
    lookupsLoading.value = true
    lookupsError.value = null
    try {
      const [facultyRows, programRows] = await Promise.all([
        searchApi.faculties(),
        searchApi.programs(filters.value.facultyId),
      ])
      if (currentLookup !== lookupId) return
      faculties.value = facultyRows
      programs.value = programRows
    } catch (err) {
      // Filters are an optional narrowing, not a precondition for searching, so
      // a failed lookup never blocks the page — but it does have to say so, or
      // empty selects look like an empty archive.
      if (currentLookup !== lookupId) return
      faculties.value = []
      programs.value = []
      lookupsError.value = getApiErrorMessage(err, 'Could not load filters')
    } finally {
      if (currentLookup === lookupId) lookupsLoading.value = false
    }
  }

  /** Refills the program select for one faculty (or every faculty when null). */
  async function loadPrograms(facultyId: number | null): Promise<void> {
    const currentLookup = ++lookupId
    try {
      const rows = await searchApi.programs(facultyId)
      if (currentLookup !== lookupId) return
      programs.value = rows
      lookupsError.value = null
    } catch (err) {
      if (currentLookup !== lookupId) return
      programs.value = []
      lookupsError.value = getApiErrorMessage(err, 'Could not load filters')
    }
  }

  /**
   * Picking a faculty invalidates the program choice (a program belongs to one
   * faculty), so the selection is cleared and the program list refetched.
   *
   * The refetch is deliberately **not** awaited. Refilling the program select
   * and re-running the search are independent: the search sends `faculty_id`,
   * which is already set on the line above, and never reads the program list.
   * Awaiting the lookup made the results sit stale for as long as the academic
   * endpoint took to answer — and because those endpoints hard-code
   * `paginate(10)`, that is several round-trips, not one.
   */
  function setFacultyFilter(facultyId: number | null): void {
    filters.value.facultyId = facultyId
    filters.value.programId = null
    void loadPrograms(facultyId)
  }

  function setProgramFilter(programId: number | null): void {
    filters.value.programId = programId
  }

  function setStatusFilter(status: StudentStatus | null): void {
    filters.value.studentStatus = status
  }

  /**
   * Clears the filter selects (and reloads the unfiltered program list).
   * Unawaited for the same reason as `setFacultyFilter`.
   */
  function resetFilters(): void {
    const hadFaculty = filters.value.facultyId !== null
    filters.value = { facultyId: null, programId: null, studentStatus: null }
    // The program list only needs refilling if it was narrowed to a faculty.
    if (hadFaculty) void loadPrograms(null)
  }

  /** Wipes the query and every result — the "start over" action. */
  function clear(): void {
    requestId += 1
    query.value = ''
    results.value = []
    meta.value = null
    error.value = null
    hasSearched.value = false
    loading.value = false
  }

  return {
    query,
    limit,
    filters,
    results,
    meta,
    loading,
    error,
    hasSearched,
    faculties,
    programs,
    lookupsLoading,
    lookupsError,
    groups,
    trimmedQuery,
    isQueryValid,
    isEmpty,
    search,
    loadLookups,
    setFacultyFilter,
    setProgramFilter,
    setStatusFilter,
    resetFilters,
    clear,
  }
})
