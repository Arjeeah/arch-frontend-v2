import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import { i18n } from '@/app/plugins/i18n'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import { settingsApi } from '../api/settingsApi'
import type {
  CapacityOverrideResult,
  OverrideCapacityInput,
  SettingsGroupKey,
  SettingsGroupModelMap,
} from '../types'

type SettingsGroupsState = Partial<{ [K in SettingsGroupKey]: SettingsGroupModelMap[K] }>

export const useSettingsStore = defineStore('settings', () => {
  const groups = reactive<SettingsGroupsState>({})
  const loading = ref(false)
  /**
   * False until the first `fetchAll` settles. `loading` alone is not enough to
   * gate the form: it is still `false` during the component's first render
   * (the fetch is kicked off in `onMounted`, which runs after), so the page
   * would paint a whole settings form full of blank inputs before the
   * skeleton ever appeared.
   */
  const loaded = ref(false)
  /** True while a save/reset/override-capacity request is in flight. */
  const saving = ref(false)
  const error = ref<string | null>(null)
  /**
   * The live temporary capacity override, if this session created one.
   *
   * Held apart from `groups.storage` deliberately: the override is not the
   * persisted setting (see `CapacityOverrideResult`), and folding it into the
   * group model made the storage form display a threshold the server does not
   * hold — one Save away from turning a 24-hour override into a permanent
   * write, which also clears the override server-side.
   *
   * Not restored on reload: the endpoint is fire-and-forget and no route reads
   * the live override back, so this is a confirmation of what just happened,
   * not a source of truth.
   */
  const capacityOverride = ref<CapacityOverrideResult | null>(null)

  async function fetchAll(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      Object.assign(groups, await settingsApi.fetchAll())
      // Re-reading the persisted settings makes any banner about a previous
      // override stale — the numbers beside it would no longer be the ones the
      // note is describing.
      capacityOverride.value = null
    } catch (err) {
      // Translated through the i18n instance rather than `useI18n()`: a store is
      // not a component, and `getApiErrorMessage`'s own fallback is hardcoded
      // English. The message is read at throw time, so it always matches the
      // locale the user is actually in.
      error.value = getApiErrorMessage(err, i18n.global.t('settings.errors.loadFailed'))
    } finally {
      loading.value = false
      loaded.value = true
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
      const result = await settingsApi.overrideCapacity(input)
      capacityOverride.value = result
      // The persisted value is re-asserted, never replaced by the override —
      // the server reports it precisely so the form can stay truthful.
      if (groups.storage) {
        groups.storage = {
          ...groups.storage,
          capacityWarningThreshold: result.persistedThreshold,
        }
      }
    } finally {
      saving.value = false
    }
  }

  return {
    groups,
    loading,
    loaded,
    saving,
    error,
    capacityOverride,
    fetchAll,
    save,
    reset,
    overrideCapacity,
  }
})
