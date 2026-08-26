import { computed, onUnmounted, ref } from 'vue'

/**
 * Repeats an async task on an interval, for as long as it is wanted.
 *
 * Uses a `setTimeout` chain rather than `setInterval` on purpose: the next tick
 * is only scheduled once the previous run has settled, so a slow request cannot
 * pile ticks up behind it. While the tab is hidden the timer keeps turning but
 * the task is skipped — nobody is looking, and a backgrounded tab hammering the
 * API for an hour is how rate limits get hit.
 *
 * Lives in this module rather than `src/shared/` because it is the only caller;
 * promote it if a second screen needs the same behaviour.
 */
export function usePolling(task: () => Promise<void> | void, intervalMs: number) {
  const active = ref(false)
  let timer: ReturnType<typeof setTimeout> | null = null

  function clearTimer(): void {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  function schedule(): void {
    clearTimer()
    timer = setTimeout(async () => {
      timer = null
      if (!active.value) return

      if (document.visibilityState === 'visible') {
        try {
          await task()
        } catch {
          // A dropped tick is not worth interrupting the operator over; the
          // task reports its own failures, and the next tick retries.
        }
      }

      if (active.value) schedule()
    }, intervalMs)
  }

  /** Idempotent — calling `start` on an already-running poll does nothing. */
  function start(): void {
    if (active.value) return
    active.value = true
    schedule()
  }

  function stop(): void {
    active.value = false
    clearTimer()
  }

  // Leaving the screen must not leave a timer behind holding the component.
  onUnmounted(stop)

  return { isPolling: computed(() => active.value), start, stop }
}
