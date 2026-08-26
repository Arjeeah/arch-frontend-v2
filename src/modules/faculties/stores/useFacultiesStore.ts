import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import type { Faculty, FacultyInput } from '../types'
import { facultiesApi } from '../api/facultiesApi'

/**
 * Single-record faculty mutations. The paginated list itself lives in
 * `useServerTable` inside `FacultyListPage` — this store only owns
 * create/update/delete.
 */
export const useFacultiesStore = defineStore('faculties', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function create(input: FacultyInput): Promise<Faculty> {
    loading.value = true
    error.value = null
    try {
      return await facultiesApi.create(input)
    } catch (err) {
      error.value = getApiErrorMessage(err, 'Failed to create faculty')
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
      error.value = getApiErrorMessage(err, 'Failed to update faculty')
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
      error.value = getApiErrorMessage(err, 'Failed to delete faculty')
      throw err
    } finally {
      loading.value = false
    }
  }

  return { loading, error, create, update, remove }
})
