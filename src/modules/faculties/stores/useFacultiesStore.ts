import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Faculties } from '../types'
import { facultiesApi } from '../api/facultiesApi'

export const useFacultiesStore = defineStore('faculties', () => {
  const items = ref<Faculties[]>([])
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      items.value = await facultiesApi.list()
    } finally {
      loading.value = false
    }
  }

  return { items, loading, fetchAll }
})
