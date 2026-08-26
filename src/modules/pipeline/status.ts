/**
 * The document pipeline's state machine, mirrored from the backend.
 *
 * Source of truth: `app/Enums/Pipeline/PipelineStatus.php` (the eight cases and
 * their allowed transitions) and `app/Traits/HasPipelineStatus.php`
 * (`isRetryable`, `scopePipelineProcessing`). Keep this file in step with those
 * two — everything else in the module derives its behaviour from here.
 */

/** Every pipeline state, in the order a document travels through them. */
export const PIPELINE_STATUSES = [
  'pending',
  'ocr_processing',
  'ocr_completed',
  'refining',
  'refined',
  'embedding',
  'completed',
  'failed',
] as const

export type PipelineStatus = (typeof PIPELINE_STATUSES)[number]

/**
 * States the backend will accept a retry for — `HasPipelineStatus::isRetryable()`.
 * `ocr_completed` is in the list because a document that finished OCR but never
 * moved on to refining is stuck, not finished.
 */
const RETRYABLE: readonly PipelineStatus[] = ['failed', 'ocr_completed']

/**
 * States a document is still moving through under its own steam, so the monitor
 * keeps polling while any document sits in one of them.
 *
 * Wider than the backend's `scopePipelineProcessing` (which lists only the three
 * `*_processing`-style states): `pending` is queued work that will start on its
 * own, and `refined` transitions to `embedding` without human input. Both change
 * without anyone touching the screen, so both are worth watching.
 *
 * `ocr_completed` is deliberately excluded — it is retryable, i.e. the backend
 * considers a document parked there to be stuck. Polling it would never settle.
 */
const IN_FLIGHT: readonly PipelineStatus[] = [
  'pending',
  'ocr_processing',
  'refining',
  'refined',
  'embedding',
]

export function isPipelineStatus(value: unknown): value is PipelineStatus {
  return typeof value === 'string' && (PIPELINE_STATUSES as readonly string[]).includes(value)
}

/** Whether `POST /v1/pipeline/{id}/retry` would be accepted for this state. */
export function isRetryableStatus(status: PipelineStatus): boolean {
  return RETRYABLE.includes(status)
}

/** Whether the state is expected to change on its own — drives the auto-poll. */
export function isInFlightStatus(status: PipelineStatus): boolean {
  return IN_FLIGHT.includes(status)
}
