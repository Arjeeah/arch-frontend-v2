import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Borrowing } from '../types'
// import { borrowingApi } from '../api/borrowingApi'

export const useBorrowingStore = defineStore('borrowing', () => {
  const items = ref<Borrowing[]>([])
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      // items.value = await borrowingApi.list()
    } finally {
      loading.value = false
    }
  }

  return { items, loading, fetchAll }
})
