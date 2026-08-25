import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import { settingsApi } from '../api/settingsApi'
import type { OverrideCapacityInput, SettingsGroupKey, SettingsGroupModelMap } from '../types'

type SettingsGroupsState = Partial<{ [K in SettingsGroupKey]: SettingsGroupModelMap[K] }>

export const useSettingsStore = defineStore('settings', () => {
  const groups = reactive<SettingsGroupsState>({})
  const loading = ref(false)
  /** True while a save/reset/override-capacity request is in flight. */
  const saving = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      Object.assign(groups, await settingsApi.fetchAll())
    } catch (err) {
      error.value = getApiErrorMessage(err, 'Failed to load settings')
    } finally {
      loading.value = false
    }
  }

  /**
   * Save/reset/override intentionally do NOT catch — the page awaits these
   * in its own try/catch and reports the outcome via `useToasts`, per the
   * "every mutation reports via toasts" convention.
   */
  async function save<G extends SettingsGroupKey>(
    group: G,
    input: Partial<SettingsGroupModelMap[G]>,
  ): Promise<SettingsGroupModelMap[G]> {
    saving.value = true
    try {
      const updated = await settingsApi.update(group, input)
      groups[group] = updated
      return updated
    } finally {
      saving.value = false
    }
  }

  async function reset<G extends SettingsGroupKey>(group: G): Promise<SettingsGroupModelMap[G]> {
    saving.value = true
    try {
      const updated = await settingsApi.reset(group)
      groups[group] = updated
      return updated
    } finally {
      saving.value = false
    }
  }

  async function overrideCapacity(input: OverrideCapacityInput): Promise<void> {
    saving.value = true
    try {
      const newThreshold = await settingsApi.overrideCapacity(input)
      if (groups.storage) {
        groups.storage = { ...groups.storage, capacityWarningThreshold: newThreshold }
      }
    } finally {
      saving.value = false
    }
  }

  return { groups, loading, saving, error, fetchAll, save, reset, overrideCapacity }
})
