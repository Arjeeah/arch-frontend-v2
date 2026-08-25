import axios from 'axios'

/**
 * Extracts a human-readable message from an unknown error thrown by an API call.
 * Laravel returns validation/business errors as `{ message: string }`.
 */
export function getApiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    const body: unknown = err.response?.data
    if (body && typeof body === 'object' && 'message' in body) {
      const message = (body as { message?: unknown }).message
      if (typeof message === 'string' && message) return message
    }
    return err.message || fallback
  }
  if (err instanceof Error && err.message) return err.message
  return fallback
}
