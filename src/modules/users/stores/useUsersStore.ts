import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'
import { usersApi } from '../api/usersApi'
import type { User } from '../types'

export const useUsersStore = defineStore('users', () => {
  const users = ref<User[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchUsers() {
    loading.value = true
    error.value = null
    try {
      const response = await usersApi.getUsers()
      users.value = response.data
    } catch (err) {
      if (axios.isAxiosError(err)) {
        error.value = err.response?.data?.message ?? 'Something went wrong'
      } else if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = 'An unexpected error occurred'
      }
    } finally {
      loading.value = false
    }
  }

  async function createUser(data: Partial<User> & { password?: string }) {
    loading.value = true
    error.value = null
    try {
      const response = await usersApi.createUser(data)
      users.value.unshift(response.data)
      return response.data
    } catch (err) {
      if (axios.isAxiosError(err)) {
        error.value = err.response?.data?.message ?? 'Something went wrong'
      } else if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = 'An unexpected error occurred'
      }
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateUser(id: number, data: Partial<User> & { password?: string }) {
    loading.value = true
    error.value = null
    try {
      const response = await usersApi.updateUser(id, data)
      const idx = users.value.findIndex((u) => u.id === id)
      if (idx !== -1) {
        users.value[idx] = response.data
      }
      return response.data
    } catch (err) {
      if (axios.isAxiosError(err)) {
        error.value = err.response?.data?.message ?? 'Something went wrong'
      } else if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = 'An unexpected error occurred'
      }
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteUser(id: number) {
    loading.value = true
    error.value = null
    try {
      await usersApi.deleteUser(id)
      users.value = users.value.filter((u) => u.id !== id)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        error.value = err.response?.data?.message ?? 'Something went wrong'
      } else if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = 'An unexpected error occurred'
      }
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    users,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
  }
})
