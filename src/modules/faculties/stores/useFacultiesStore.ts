import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Faculty } from '../types'
import { facultiesApi } from '../api/facultiesApi'

export const useFacultiesStore = defineStore('faculties', () => {
  const items = ref<Faculty[]>([])
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      items.value = await facultiesApi.list()
    } finally {
      loading.value = false
    }
  }

  async function create(data: Partial<Faculty>) {
    loading.value = true
    try {
      const newFaculty = await facultiesApi.create(data)
      items.value.unshift(newFaculty)
    } finally {
      loading.value = false
    }
  }

  async function update(id: number, data: Partial<Faculty>) {
    loading.value = true
    try {
      const updatedFaculty = await facultiesApi.update(id, data)
      const index = items.value.findIndex((f) => f.id === id)
      if (index !== -1) {
        items.value[index] = updatedFaculty
      }
    } finally {
      loading.value = false
    }
  }

  async function remove(id: number) {
    loading.value = true
    try {
      await facultiesApi.delete(id)
      const index = items.value.findIndex((f) => f.id === id)
      if (index !== -1) {
        items.value.splice(index, 1)
      }
    } finally {
      loading.value = false
    }
  }

  return { items, loading, fetchAll, create, update, remove }
})
