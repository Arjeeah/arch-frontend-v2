import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import { i18n } from '@/app/plugins/i18n'
import type { Faculty, FacultyInput } from '../types'
import { facultiesApi } from '../api/facultiesApi'

/**
 * Single-record faculty mutations. The paginated list itself lives in
 * `useServerTable` inside `FacultyListPage` — this store only owns
 * create/update/delete.
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

export const useFacultiesStore = defineStore('faculties', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function create(input: FacultyInput): Promise<Faculty> {
    loading.value = true
    error.value = null
    try {
      return await facultiesApi.create(input)
    } catch (err) {
      error.value = getApiErrorMessage(err, tr('faculties.toast.saveFailed'))
      throw err
    } finally {
      loading.value = false
    }
  }

  async function update(id: number, input: Partial<FacultyInput>): Promise<Faculty> {
    loading.value = true
    error.value = null
    try {
      return await facultiesApi.update(id, input)
    } catch (err) {
      error.value = getApiErrorMessage(err, tr('faculties.toast.saveFailed'))
      throw err
    } finally {
      loading.value = false
    }
  }

  async function remove(id: number): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await facultiesApi.delete(id)
    } catch (err) {
      error.value = getApiErrorMessage(err, tr('faculties.toast.deleteFailed'))
      throw err
    } finally {
      loading.value = false
    }
  }

  return { loading, error, create, update, remove }
})
