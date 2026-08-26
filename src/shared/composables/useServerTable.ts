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
  current_page?: number
  lastPage?: number
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

function readMeta(meta: ServerTableMeta, snake: 'last_page' | 'current_page'): number | undefined {
  const camel = snake === 'last_page' ? meta.lastPage : meta.currentPage
  return meta[snake] ?? camel
}

/**
 * Server-side pagination for Laravel `{ data, meta }` endpoints — the replacement
 * for the client-side `usePagination` pattern once a list grows past one page.
 *
 * ```ts
 * const table = useServerTable((params) => usersApi.list(params), {
 *   perPage: 15,
 *   errorFallback: t('users.errors.listFailed'),
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

    try {
      const response = await fetcher({
        ...filters.value,
        page: page.value,
        per_page: perPage.value,
      })
      if (currentRequest !== requestId) return

      rows.value = response.data ?? []
      total.value = response.meta?.total ?? rows.value.length
      totalPages.value = Math.max(1, readMeta(response.meta ?? {}, 'last_page') ?? 1)

      // The API is the source of truth for the current page (it clamps out-of-range pages).
      const serverPage = readMeta(response.meta ?? {}, 'current_page')
      if (serverPage && serverPage !== page.value) page.value = serverPage
    } catch (err: unknown) {
      if (currentRequest !== requestId) return
      rows.value = []
      total.value = 0
      totalPages.value = 1
      error.value = getApiErrorMessage(err, errorFallback)
    } finally {
      if (currentRequest === requestId) loading.value = false
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
