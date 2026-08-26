import axios from 'axios'

/**
 * Extracts a human-readable message from an unknown error thrown by an API call.
 * Laravel returns validation/business errors as `{ message: string }`.
 *
 * When the response carries no `{ message }` body — network down, timeout, a
 * bare 500 — axios still exposes its own English `err.message`
 * (`"Network Error"`, `"Request failed with status code 500"`). Returning that
 * used to override the caller's `fallback`, which is the one string that *is*
 * translated: thirteen list pages rendered an English sentence inside an
 * otherwise Arabic error card. The caller's fallback wins in that case now.
 *
 * `src/shared/` may not import `src/app/`, so this helper cannot translate on
 * its own — every call site is expected to pass a `t(...)` fallback.
 */
export function getApiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    const body: unknown = err.response?.data
    if (body && typeof body === 'object' && 'message' in body) {
      const message = (body as { message?: unknown }).message
      if (typeof message === 'string' && message) return message
    }
    return fallback
  }
  if (err instanceof Error && err.message) return err.message
  return fallback
}
