import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import { usersApi } from '../api/usersApi'
import type { User, UserInput } from '../types'

export const useUsersStore = defineStore('users', () => {
  const users = ref<User[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchUsers() {
    loading.value = true
    error.value = null
    try {
      users.value = await usersApi.list()
    } catch (err) {
      error.value = getApiErrorMessage(err, 'Failed to load users')
    } finally {
      loading.value = false
    }
  }

  /**
   * Loads a single user by id and upserts it into `users`. The list endpoint
   * is paginated, so a deep link cannot rely on the user being in page one.
   */
  async function fetchUser(id: number) {
    loading.value = true
    error.value = null
    try {
      const user = await usersApi.show(id)
      const idx = users.value.findIndex((u) => u.id === id)
      if (idx === -1) users.value.push(user)
      else users.value[idx] = user
      return user
    } catch (err) {
      error.value = getApiErrorMessage(err, 'Failed to load user')
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createUser(input: UserInput) {
    loading.value = true
    error.value = null
    try {
      const created = await usersApi.create(input)
      users.value.unshift(created)
      return created
    } catch (err) {
      error.value = getApiErrorMessage(err, 'Failed to create user')
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateUser(id: number, input: Partial<UserInput>) {
    loading.value = true
    error.value = null
    try {
      const updated = await usersApi.update(id, input)
      const idx = users.value.findIndex((u) => u.id === id)
      if (idx !== -1) {
        users.value[idx] = updated
      }
      return updated
    } catch (err) {
      error.value = getApiErrorMessage(err, 'Failed to update user')
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteUser(id: number) {
    loading.value = true
    error.value = null
    try {
      await usersApi.delete(id)
      users.value = users.value.filter((u) => u.id !== id)
    } catch (err) {
      error.value = getApiErrorMessage(err, 'Failed to delete user')
      throw err
    } finally {
      loading.value = false
    }
  }

  return { users, loading, error, fetchUsers, fetchUser, createUser, updateUser, deleteUser }
})
