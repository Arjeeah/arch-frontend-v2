import { ref, computed, watch } from 'vue'
import type { Ref, ComputedRef } from 'vue'

export function usePagination<T>(
  items: Ref<T[]> | ComputedRef<T[]>,
  perPage = 10,
) {
  const currentPage = ref(1)

  const totalPages = computed(() =>
    Math.max(1, Math.ceil(items.value.length / perPage)),
  )

  const paginated = computed(() => {
    const start = (currentPage.value - 1) * perPage
    return items.value.slice(start, start + perPage)
  })

  function resetPage() {
    currentPage.value = 1
  }

  // Keep current page in range when the item list shrinks
  watch(totalPages, (total) => {
    if (currentPage.value > total) currentPage.value = total
  })

  return { currentPage, totalPages, paginated, resetPage }
}
