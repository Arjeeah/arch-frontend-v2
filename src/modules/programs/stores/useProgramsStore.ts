import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Program, ProgramInput } from '../types'
import { programsApi } from '../api/programsApi'

/**
 * Mutation-only store: the list itself is owned by `useServerTable` on the
 * page (server-paginated, filtered, searched), so there is no `items` array
 * here to keep in sync with it — see `useDocumentTypesStore` for the same
 * shape and rationale.
 */
export const useProgramsStore = defineStore('programs', () => {
  const loading = ref(false)

  async function create(input: ProgramInput): Promise<Program> {
    loading.value = true
    try {
      return await programsApi.create(input)
    } finally {
      loading.value = false
    }
  }

  async function update(id: number, input: Partial<ProgramInput>): Promise<Program> {
    loading.value = true
    try {
      return await programsApi.update(id, input)
    } finally {
      loading.value = false
    }
  }

  async function remove(id: number): Promise<void> {
    loading.value = true
    try {
      await programsApi.delete(id)
    } finally {
      loading.value = false
    }
  }

  return { loading, create, update, remove }
})
