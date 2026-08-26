import { computed, ref, watch } from 'vue'
import type { Ref } from 'vue'
import { getApiErrorMessage } from '@/shared/utils/apiError'

/** Query string sent to a Laravel-paginated endpoint. */
export interface ServerTableParams extends Record<string, unknown> {
  page: number
  per_page: number
}

/**
 * Laravel pagination meta. Both casings are accepted so the composable keeps
 * working whether or not the axios response interceptor camelCases payloads.
 */
export interface ServerTableMeta {
  last_page?: number
  lastPage?: number
  /**
   * Read for completeness only — never trusted. Laravel echoes the page that
   * was *asked for*, not the one it could serve, so a request past the end
   * comes back as `current_page: 999, last_page: 10`. `refresh()` clamps
   * against `last_page` instead; see the note there.
   */
  current_page?: number
  currentPage?: number
  total?: number
}

export interface ServerTableResponse<T> {
  data: T[]
  meta: ServerTableMeta
}

export type ServerTableFetcher<T> = (params: ServerTableParams) => Promise<ServerTableResponse<T>>

export interface ServerTableOptions {
  /**
   * Translated message shown when the request fails with no `{ message }` body
   * (network down, timeout, a bare 500). Required — and required *translated* —
   * because `error` is rendered verbatim by every list page, and
   * `src/shared/` may not import the app's i18n instance to translate it here.
   */
  errorFallback: string
  /** Rows per page. Default 10. */
  perPage?: number
  /** Initial filter/query params merged into every request. */
  filters?: Record<string, unknown>
  /** Fetch immediately on creation. Default true. */
  immediate?: boolean
}

/** Both casings, because the axios interceptor may or may not camelCase. */
function readLastPage(meta: ServerTableMeta): number | undefined {
  return meta.last_page ?? meta.lastPage
}

/**
 * Server-side pagination for Laravel `{ data, meta }` endpoints — the replacement
 * for the client-side `usePagination` pattern once a list grows past one page.
 *
 * ```ts
 * const table = useServerTable((params) => studentsApi.list(params), {
 *   perPage: 15,
 *   errorFallback: t('students.errors.listFailed'),
 * })
 * watch(debouncedSearch, (q) => table.setFilters({ search: q }))
 * ```
 *
 * Changing `page`, `perPage` or the filters triggers a refetch; stale responses
 * from slower in-flight requests are discarded.
 */
export function useServerTable<T>(fetcher: ServerTableFetcher<T>, options: ServerTableOptions) {
  const {
    errorFallback,
    perPage: initialPerPage = 10,
    filters: initialFilters = {},
    immediate = true,
  } = options

  const rows = ref([]) as Ref<T[]>
  const loading = ref(false)
  const error = ref<string | null>(null)
  const page = ref(1)
  const perPage = ref(initialPerPage)
  const total = ref(0)
  const totalPages = ref(1)
  const filters = ref<Record<string, unknown>>({ ...initialFilters })

  let requestId = 0

  async function refresh(): Promise<void> {
    const currentRequest = ++requestId
    loading.value = true
    error.value = null
    // Set when this run hands off to a clamping refetch, so `finally` leaves
    // `loading` true and the table never flashes its empty state in between.
    let clamping = false

    try {
      const response = await fetcher({
        ...filters.value,
        page: page.value,
        per_page: perPage.value,
      })
      if (currentRequest !== requestId) return

      const lastPage = Math.max(1, readLastPage(response.meta ?? {}) ?? 1)

      /**
       * Laravel's paginator does **not** clamp an out-of-range page — it echoes
       * the requested one back with an empty `data` array:
       *
       *   GET /v1/students?page=999&per_page=5
       *     -> meta { current_page: 999, last_page: 10, total: 50 }, data: []
       *
       * Left alone, `page` stays 999, `totalPages` collapses to 10, `isEmpty`
       * flips true — and `AppPagination` highlights no page while leaving
       * "next" enabled, because `currentPage === totalPages` is false. The
       * table is replaced by the empty state with no way back.
       *
       * Deleting the last row of the last page is the reachable route into
       * that: five list pages had each grown their own `page.value -= 1`
       * workaround, and six delete-capable ones had not. Clamping here covers
       * every caller, including a hand-typed `?page=`.
       */
      if (page.value > lastPage) {
        totalPages.value = lastPage
        clamping = true
        page.value = lastPage // the `page` watcher refetches
        return
      }

      rows.value = response.data ?? []
      total.value = response.meta?.total ?? rows.value.length
      totalPages.value = lastPage
    } catch (err: unknown) {
      if (currentRequest !== requestId) return
      rows.value = []
      total.value = 0
      totalPages.value = 1
      error.value = getApiErrorMessage(err, errorFallback)
    } finally {
      if (currentRequest === requestId && !clamping) loading.value = false
    }
  }

  /** Merge new filter values in and jump back to page 1. */
  function setFilters(next: Record<string, unknown>): void {
    filters.value = { ...filters.value, ...next }
    if (page.value !== 1) {
      page.value = 1
      return // the page watcher refetches
    }
    void refresh()
  }

  /** Drop every filter and jump back to page 1. */
  function resetFilters(): void {
    filters.value = {}
    if (page.value !== 1) {
      page.value = 1
      return
    }
    void refresh()
  }

  watch(page, () => void refresh())
  watch(perPage, () => {
    if (page.value !== 1) {
      page.value = 1
      return
    }
    void refresh()
  })

  if (immediate) void refresh()

  return {
    rows,
    loading,
    error,
    page,
    perPage,
    total,
    totalPages,
    filters: computed(() => filters.value),
    isEmpty: computed(() => !loading.value && !error.value && rows.value.length === 0),
    setFilters,
    resetFilters,
    refresh,
  }
}
