import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getApiErrorMessage, getApiErrorStatus } from '@/shared/utils/apiError'
import { i18n } from '@/app/plugins/i18n'
import { studentsApi } from '../api/studentsApi'
import type { Student, StudentInput } from '../types'

/**
 * Single-student state plus the write operations both screens share.
 *
 * The list itself is not held here — `StudentListPage` drives it through
 * `useServerTable`, which owns page/filter state and refetches on demand.
 * Mutations throw so the calling page can decide what to toast.
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

export const useStudentsStore = defineStore('students', () => {
  const current = ref<Student | null>(null)
  const requiredDocumentTypes = ref<Array<{ id: string; name: string }>>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  async function fetchStudent(id: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const detail = await studentsApi.show(id)
      current.value = detail.student
      requiredDocumentTypes.value = detail.requiredDocumentTypes
    } catch (err) {
      current.value = null
      requiredDocumentTypes.value = []
      // `getApiErrorMessage` answers a 404 with the fallback rather than
      // Laravel's `No query results for model [App\Models\Student] <uuid>`,
      // so a deleted student has to pick the localized not-found line here —
      // `StudentDetailPage` renders `store.error` verbatim.
      error.value = getApiErrorMessage(
        err,
        getApiErrorStatus(err) === 404
          ? tr('students.errors.notFound')
          : tr('students.errors.detailFailed'),
      )
    } finally {
      loading.value = false
    }
  }

  async function create(input: StudentInput): Promise<Student> {
    saving.value = true
    try {
      return await studentsApi.create(input)
    } finally {
      saving.value = false
    }
  }

  async function update(id: string, input: Partial<StudentInput>): Promise<Student> {
    saving.value = true
    try {
      const updated = await studentsApi.update(id, input)
      if (current.value?.id === id) {
        // `update` reloads faculty/program/drawer but not documents, so keep
        // the ones already on screen instead of blanking the documents card.
        current.value = { ...updated, documents: current.value.documents }
      }
      return updated
    } finally {
      saving.value = false
    }
  }

  async function remove(id: string): Promise<void> {
    saving.value = true
    try {
      await studentsApi.delete(id)
      if (current.value?.id === id) current.value = null
    } finally {
      saving.value = false
    }
  }

  /** Confirms an AI-created draft record as a real student. */
  async function promoteToActive(id: string): Promise<Student> {
    return update(id, { studentStatus: 'active' })
  }

  function reset(): void {
    current.value = null
    requiredDocumentTypes.value = []
    error.value = null
  }

  return {
    current,
    requiredDocumentTypes,
    loading,
    saving,
    error,
    fetchStudent,
    create,
    update,
    remove,
    promoteToActive,
    reset,
  }
})
