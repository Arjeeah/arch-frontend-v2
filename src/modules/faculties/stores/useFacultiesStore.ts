import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import type { Faculty, FacultyInput } from '../types'
import { facultiesApi } from '../api/facultiesApi'

export const useFacultiesStore = defineStore('faculties', () => {
  const items = ref<Faculty[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      items.value = await facultiesApi.list()
    } catch (err) {
      error.value = getApiErrorMessage(err, 'Failed to load faculties')
    } finally {
      loading.value = false
    }
  }

  async function create(input: FacultyInput) {
    loading.value = true
    error.value = null
    try {
      const created = await facultiesApi.create(input)
      items.value.unshift(created)
      return created
    } catch (err) {
      error.value = getApiErrorMessage(err, 'Failed to create faculty')
      throw err
    } finally {
      loading.value = false
    }
  }

  async function update(id: number, input: Partial<FacultyInput>) {
    loading.value = true
    error.value = null
    try {
      const updated = await facultiesApi.update(id, input)
      const index = items.value.findIndex((f) => f.id === id)
      if (index !== -1) {
        items.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = getApiErrorMessage(err, 'Failed to update faculty')
      throw err
    } finally {
      loading.value = false
    }
  }

  async function remove(id: number) {
    loading.value = true
    error.value = null
    try {
      await facultiesApi.delete(id)
      const index = items.value.findIndex((f) => f.id === id)
      if (index !== -1) {
        items.value.splice(index, 1)
      }
    } catch (err) {
      error.value = getApiErrorMessage(err, 'Failed to delete faculty')
      throw err
    } finally {
      loading.value = false
    }
  }

  return { items, loading, error, fetchAll, create, update, remove }
})
