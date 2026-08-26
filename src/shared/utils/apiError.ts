import axios from 'axios'

/**
 * How many field messages a 422 is allowed to contribute to a single toast
 * before the rest are elided. Three is roughly one toast line.
 */
const MAX_FIELD_ERRORS = 3

/**
 * The HTTP status of a failed API call, or `null` when the request never got
 * an answer (network down, timeout, an aborted request) or the error is not an
 * axios one at all.
 *
 * Exported because two detail pages need to tell "this record is gone" from
 * "the request failed": `getApiErrorMessage` deliberately answers a 404 with
 * the caller's generic fallback, so a page that has a *specific* not-found
 * string has to pick that fallback itself.
 */
export function getApiErrorStatus(err: unknown): number | null {
  return axios.isAxiosError(err) ? (err.response?.status ?? null) : null
}

/**
 * The `errors` bag Laravel attaches to a 422, flattened and de-duplicated in
 * declaration order. Empty for every other status and for bodies without one.
 *
 * Exported so a dialog can map the bag back onto its own field state; the
 * message helper below only uses it to say something more useful than
 * `"Validation failed."`.
 */
export function getApiFieldErrors(err: unknown): string[] {
  if (!axios.isAxiosError(err)) return []
  return readFieldErrors(err.response?.data)
}

function readFieldErrors(body: unknown): string[] {
  if (!body || typeof body !== 'object' || !('errors' in body)) return []
  const errors = (body as { errors?: unknown }).errors
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) return []

  const messages: string[] = []
  for (const value of Object.values(errors as Record<string, unknown>)) {
    for (const entry of Array.isArray(value) ? value : [value]) {
      if (typeof entry === 'string' && entry && !messages.includes(entry)) messages.push(entry)
    }
  }
  return messages
}

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
 * **The status decides whether the server's `message` is fit to show at all.**
 * It is written for the developer, not the user, on exactly two classes of
 * response, so both are answered with the caller's translated `fallback`:
 *
 * - **404** — Laravel's `convertExceptionToArray()` returns `$e->getMessage()`
 *   for any `HttpExceptionInterface`, and a route-model-binding miss is a
 *   `NotFoundHttpException`. That is **not** debug-only: opening a deleted
 *   document shipped `No query results for model [App\Models\StudentDocument]
 *   01a03de0-…` — model class and primary key — to the user, in place of the
 *   localized "not found" the page had already written for that case.
 * - **5xx** — debug builds return the exception message. `POST /v1/search` on a
 *   non-Postgres stack answers 500 with the whole failing `SELECT` (schema,
 *   column names, `ts_rank`/`plainto_tsquery` and all) in `message`, and the
 *   search page binds `message` straight to its error card. Production trades
 *   that for a bare English `"Server Error"`, which is no more useful inside an
 *   `ar`-default UI than the fallback is.
 *
 * Every other 4xx keeps the server's text: 401/403/409 carry a real reason, and
 * 422 carries the one thing the user can act on. A 422 is read out of `errors`
 * rather than `message` when it has one — Laravel's default `message` is the
 * first failure plus `"(and N more errors)"`, and `POST /v1/imports/{type}`
 * answers with a generic `"Validation failed."` that drops the only useful
 * sentence (`errors.file`) on the floor.
 *
 * `src/shared/` may not import `src/app/`, so this helper cannot translate on
 * its own — every call site is expected to pass a `t(...)` fallback.
 */
export function getApiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status

    if (status !== undefined && (status === 404 || status >= 500)) return fallback

    const body: unknown = err.response?.data

    if (status === 422) {
      const fieldErrors = readFieldErrors(body)
      if (fieldErrors.length > 0) {
        const shown = fieldErrors.slice(0, MAX_FIELD_ERRORS).join(' ')
        return fieldErrors.length > MAX_FIELD_ERRORS ? `${shown} …` : shown
      }
    }

    if (body && typeof body === 'object' && 'message' in body) {
      const message = (body as { message?: unknown }).message
      if (typeof message === 'string' && message) return message
    }
    return fallback
  }
  if (err instanceof Error && err.message) return err.message
  return fallback
}
