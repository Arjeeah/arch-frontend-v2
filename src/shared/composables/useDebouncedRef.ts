import { onScopeDispose, shallowRef, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'

/**
 * Mirrors `source` into a new ref that only updates after `delay` ms of silence.
 *
 * Use it for anything that fans out to the network on every keystroke
 * (search bars, typeahead selects):
 *
 * ```ts
 * const search = ref('')
 * const debouncedSearch = useDebouncedRef(search, 300)
 * watch(debouncedSearch, (q) => fetchResults(q))
 * ```
 *
 * The pending timer is cleared when the owning component/scope is disposed.
 */
export function useDebouncedRef<T>(source: MaybeRefOrGetter<T>, delay = 300): Readonly<Ref<T>> {
  const debounced = shallowRef(toValue(source)) as Ref<T>
  let timer: ReturnType<typeof setTimeout> | undefined

  function cancel() {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
  }

  watch(
    () => toValue(source),
    (value) => {
      cancel()
      if (delay <= 0) {
        debounced.value = value
        return
      }
      timer = setTimeout(() => {
        timer = undefined
        debounced.value = value
      }, delay)
    },
  )

  onScopeDispose(cancel, true)

  return debounced
}
