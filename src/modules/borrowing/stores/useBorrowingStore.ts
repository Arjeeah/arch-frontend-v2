import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import { borrowingApi } from '../api/borrowingApi'
import type { Borrowing, BorrowingInput } from '../types'

export const useBorrowingStore = defineStore('borrowing', () => {
  const items = ref<Borrowing[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      items.value = await borrowingApi.list()
    } catch (err) {
      error.value = getApiErrorMessage(err, 'Failed to load borrowings')
    } finally {
      loading.value = false
    }
  }

  async function create(input: BorrowingInput) {
    loading.value = true
    error.value = null
    try {
      const created = await borrowingApi.create(input)
      items.value.unshift(created)
      return created
    } catch (err) {
      error.value = getApiErrorMessage(err, 'Failed to create borrowing')
      throw err
    } finally {
      loading.value = false
    }
  }

  async function update(id: number, input: Partial<BorrowingInput>) {
    loading.value = true
    error.value = null
    try {
      const updated = await borrowingApi.update(id, input)
      const idx = items.value.findIndex((i) => i.id === id)
      if (idx !== -1) items.value[idx] = updated
      return updated
    } catch (err) {
      error.value = getApiErrorMessage(err, 'Failed to update borrowing')
      throw err
    } finally {
      loading.value = false
    }
  }

  async function remove(id: number) {
    loading.value = true
    error.value = null
    try {
      await borrowingApi.delete(id)
      const idx = items.value.findIndex((i) => i.id === id)
      if (idx !== -1) items.value.splice(idx, 1)
    } catch (err) {
      error.value = getApiErrorMessage(err, 'Failed to delete borrowing')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Runs a workflow transition, then reloads the list so server-derived state
   * (status, borrowed_at, returned_at, overdue flags) stays authoritative.
   */
  async function runTransition(action: () => Promise<Borrowing>, failureMessage: string) {
    loading.value = true
    error.value = null
    try {
      await action()
    } catch (err) {
      error.value = getApiErrorMessage(err, failureMessage)
      loading.value = false
      throw err
    }
    loading.value = false
    await fetchAll()
  }

  const approve = (id: number) =>
    runTransition(() => borrowingApi.approve(id), 'Failed to approve borrowing')

  const reject = (id: number) =>
    runTransition(() => borrowingApi.reject(id), 'Failed to reject borrowing')

  const markBorrowed = (id: number) =>
    runTransition(() => borrowingApi.markBorrowed(id), 'Failed to mark as borrowed')

  const markReturned = (id: number) =>
    runTransition(() => borrowingApi.markReturned(id), 'Failed to mark as returned')

  return {
    items,
    loading,
    error,
    fetchAll,
    create,
    update,
    remove,
    approve,
    reject,
    markBorrowed,
    markReturned,
  }
})
