import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'

export type ToastVariant = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  message: string
  variant: ToastVariant
  /** ms before the toast auto-dismisses; `0` keeps it until dismissed manually. */
  duration: number
}

/** Default lifetime of a toast, in milliseconds. */
export const TOAST_DURATION = 4000

/** Module-scope singleton — every caller of `useToasts()` shares this queue. */
const toasts = ref<Toast[]>([])
const timers = new Map<number, ReturnType<typeof setTimeout>>()
let nextId = 0

function dismiss(id: number): void {
  const timer = timers.get(id)
  if (timer !== undefined) {
    clearTimeout(timer)
    timers.delete(id)
  }
  toasts.value = toasts.value.filter((toast) => toast.id !== id)
}

function clear(): void {
  for (const timer of timers.values()) clearTimeout(timer)
  timers.clear()
  toasts.value = []
}

function push(variant: ToastVariant, message: string, duration = TOAST_DURATION): number {
  const id = ++nextId
  toasts.value = [...toasts.value, { id, message, variant, duration }]
  if (duration > 0) {
    timers.set(
      id,
      setTimeout(() => dismiss(id), duration),
    )
  }
  return id
}

/**
 * App-wide toast queue.
 *
 * ```ts
 * const { success, error } = useToasts()
 * success('Faculty created')
 * error(getApiErrorMessage(err))
 * ```
 *
 * Render `AppToastHost` once (in `App.vue`) for the toasts to appear.
 */
export function useToasts() {
  return {
    toasts: computed(() => toasts.value),
    success: (message: string, duration?: number) => push('success', message, duration),
    error: (message: string, duration?: number) => push('error', message, duration),
    info: (message: string, duration?: number) => push('info', message, duration),
    dismiss,
    clear,
  }
}

/**
 * Internal — lets `AppToastHost` de-duplicate itself when more than one host is
 * mounted (e.g. the global one in `App.vue` plus the component-gallery demo).
 * Only the first mounted host renders.
 */
const activeHosts = ref<number[]>([])
let nextHostId = 0

export function useToastHost(): { isPrimaryHost: ComputedRef<boolean>; toasts: Ref<Toast[]> } {
  const hostId = ++nextHostId

  onMounted(() => {
    activeHosts.value = [...activeHosts.value, hostId]
  })
  onBeforeUnmount(() => {
    activeHosts.value = activeHosts.value.filter((id) => id !== hostId)
  })

  return {
    isPrimaryHost: computed(() => activeHosts.value[0] === hostId),
    toasts,
  }
}
