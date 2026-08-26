import { ref, type Ref } from 'vue'
import axios from 'axios'
import { getApiErrorMessage } from '@/shared/utils/apiError'

export interface AsyncResource<T> {
  data: Ref<T | null>
  loading: Ref<boolean>
  /** Human-readable message from the failed request, or `null`. */
  error: Ref<string | null>
  /**
   * HTTP status of the failure, so a card can tell one refusal from another —
   * an archivist calling a super-admin-only panel gets a 403 that deserves
   * different copy from a server fault. No page reads it at the moment: the
   * faculty dashboard used to, to blame every 500 on a since-fixed
   * pending-borrowing bug, and naming a repaired bug as the cause of any 500
   * was worse than saying nothing.
   */
  status: Ref<number | null>
  /** (Re)runs the loader. Safe to call from a retry button. */
  load: () => Promise<void>
}

export interface AsyncResourceOptions {
  /** Fetch as soon as the resource is created. Default true. */
  immediate?: boolean
  /**
   * Message to show when the failure carries none of its own — a dropped
   * connection, a CORS refusal, a timeout.
   *
   * Required, and required to be a translated string: this text is rendered to
   * the user, so a default baked in here would ship English into the Arabic UI
   * without ever passing through `t()`. Callers pass `t('dashboard.loadFailed')`.
   */
  errorFallback: string
}

/**
 * One read-only request with its own loading / error / retry state.
 *
 * A dashboard is a grid of independent panels fed by several endpoints, each
 * role-gated differently — the admin page alone draws on five. Giving every
 * panel its own resource means one 403 or 500 costs that panel only, the rest
 * of the page still renders, and each panel retries without refetching the lot.
 *
 * Lists use `useServerTable` instead; this is for single aggregate payloads
 * that are not paginated.
 */
export function useAsyncResource<T>(
  loader: () => Promise<T>,
  options: AsyncResourceOptions,
): AsyncResource<T> {
  const { immediate = true, errorFallback } = options

  const data = ref(null) as Ref<T | null>
  const loading = ref(false)
  const error = ref<string | null>(null)
  const status = ref<number | null>(null)

  // Guards against an out-of-order response from a slow first attempt
  // overwriting a fresher retry.
  let requestId = 0

  async function load(): Promise<void> {
    const currentRequest = ++requestId
    loading.value = true
    error.value = null
    status.value = null

    try {
      const result = await loader()
      if (currentRequest !== requestId) return
      data.value = result
    } catch (err: unknown) {
      if (currentRequest !== requestId) return
      data.value = null
      status.value = axios.isAxiosError(err) ? (err.response?.status ?? null) : null
      error.value = getApiErrorMessage(err, errorFallback)
    } finally {
      if (currentRequest === requestId) loading.value = false
    }
  }

  if (immediate) void load()

  return { data, loading, error, status, load }
}
