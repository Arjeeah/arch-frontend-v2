import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DocumentType, DocumentTypeInput } from '../types'
import { documentTypesApi } from '../api/documentTypesApi'

/**
 * Mutation-only store: the list itself is owned by `useServerTable` on the
 * page (server-paginated, filtered, searched), so there is no `items` array
 * here to keep in sync with it. `create`/`update`/`remove` just wrap the api
 * calls with a shared `loading` flag; the page calls `refresh()` on the table
 * afterwards to pick up the change.
 */
export const useDocumentTypesStore = defineStore('documentTypes', () => {
  const loading = ref(false)

  async function create(input: DocumentTypeInput): Promise<DocumentType> {
    loading.value = true
    try {
      return await documentTypesApi.create(input)
    } finally {
      loading.value = false
    }
  }

  async function update(id: string, input: Partial<DocumentTypeInput>): Promise<DocumentType> {
    loading.value = true
    try {
      return await documentTypesApi.update(id, input)
    } finally {
      loading.value = false
    }
  }

  async function remove(id: string): Promise<void> {
    loading.value = true
    try {
      await documentTypesApi.delete(id)
    } finally {
      loading.value = false
    }
  }

  return { loading, create, update, remove }
})
