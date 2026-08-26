import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import { i18n } from '@/app/plugins/i18n'
import { borrowingApi } from '../api/borrowingApi'
import type { BorrowingCreateInput, BorrowingUpdateInput } from '../types'

/**
 * Single-record borrowing mutations. The paginated list itself lives in
 * `useServerTable` inside `BorrowingListPage` — this store only owns the
 * create/update/delete/workflow calls; the page calls `refresh()` on the
 * table afterwards so server-derived state (status, borrowed_at, overdue
 * flags, …) stays authoritative.
 */
/**
 * Store-level copy. These fallbacks land in `error`, which the pages render
 * verbatim, so they have to be translated — an Arabic operator whose
 * connection dropped mid-delete read an English sentence inside an otherwise
 * Arabic dialog. A store is not a component, so it goes through the i18n
 * instance directly, the way `useImportsStore` does.
 */
function tr(key: string): string {
  return i18n.global.t(key)
}

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
    run(() => borrowingApi.create(input), tr('borrowing.toast.saveFailed'))

  const update = (id: string, input: BorrowingUpdateInput) =>
    run(() => borrowingApi.update(id, input), tr('borrowing.toast.saveFailed'))

  const remove = (id: string) =>
    run(() => borrowingApi.delete(id), tr('borrowing.toast.actionFailed'))

  const approve = (id: string) =>
    run(() => borrowingApi.approve(id), tr('borrowing.toast.actionFailed'))

  const reject = (id: string, rejectionReason: string) =>
    run(() => borrowingApi.reject(id, rejectionReason), tr('borrowing.toast.actionFailed'))

  const markBorrowed = (id: string) =>
    run(() => borrowingApi.markBorrowed(id), tr('borrowing.toast.actionFailed'))

  const markReturned = (id: string) =>
    run(() => borrowingApi.markReturned(id), tr('borrowing.toast.actionFailed'))

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
