import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import { i18n } from '@/app/plugins/i18n'
import { usersApi } from '../api/usersApi'
import type { User, UserInput } from '../types'

/**
 * Single-record user operations. The paginated list itself lives in
 * `useServerTable` inside `UserListPage` — this store only owns mutations
 * (create/update/delete) and the one-off fetch a deep link to `/users/:id`
 * needs.
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

export const useUsersStore = defineStore('users', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchUser(id: string): Promise<User> {
    loading.value = true
    error.value = null
    try {
      return await usersApi.show(id)
    } catch (err) {
      error.value = getApiErrorMessage(err, tr('users.toast.loadFailed'))
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createUser(input: UserInput): Promise<User> {
    loading.value = true
    error.value = null
    try {
      return await usersApi.create(input)
    } catch (err) {
      error.value = getApiErrorMessage(err, tr('users.toast.saveFailed'))
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateUser(id: string, input: Partial<UserInput>): Promise<User> {
    loading.value = true
    error.value = null
    try {
      return await usersApi.update(id, input)
    } catch (err) {
      error.value = getApiErrorMessage(err, tr('users.toast.saveFailed'))
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteUser(id: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await usersApi.delete(id)
    } catch (err) {
      error.value = getApiErrorMessage(err, tr('users.toast.deleteFailed'))
      throw err
    } finally {
      loading.value = false
    }
  }

  return { loading, error, fetchUser, createUser, updateUser, deleteUser }
})
