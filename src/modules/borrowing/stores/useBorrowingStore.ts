import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import { borrowingApi } from '../api/borrowingApi'
import type { BorrowingCreateInput, BorrowingUpdateInput } from '../types'

/**
 * Single-record borrowing mutations. The paginated list itself lives in
 * `useServerTable` inside `BorrowingListPage` — this store only owns the
 * create/update/delete/workflow calls; the page calls `refresh()` on the
 * table afterwards so server-derived state (status, borrowed_at, overdue
 * flags, …) stays authoritative.
 */
export const useBorrowingStore = defineStore('borrowing', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function run<T>(action: () => Promise<T>, failureMessage: string): Promise<T> {
    loading.value = true
    error.value = null
    try {
      return await action()
    } catch (err) {
      error.value = getApiErrorMessage(err, failureMessage)
      throw err
    } finally {
      loading.value = false
    }
  }

  const create = (input: BorrowingCreateInput) =>
    run(() => borrowingApi.create(input), 'Failed to create borrowing')

  const update = (id: string, input: BorrowingUpdateInput) =>
    run(() => borrowingApi.update(id, input), 'Failed to update borrowing')

  const remove = (id: string) => run(() => borrowingApi.delete(id), 'Failed to delete borrowing')

  const approve = (id: string) => run(() => borrowingApi.approve(id), 'Failed to approve borrowing')

  const reject = (id: string, rejectionReason: string) =>
    run(() => borrowingApi.reject(id, rejectionReason), 'Failed to reject borrowing')

  const markBorrowed = (id: string) =>
    run(() => borrowingApi.markBorrowed(id), 'Failed to mark as borrowed')

  const markReturned = (id: string) =>
    run(() => borrowingApi.markReturned(id), 'Failed to mark as returned')

  return {
    loading,
    error,
    create,
    update,
    remove,
    approve,
    reject,
    markBorrowed,
    markReturned,
  }
})
