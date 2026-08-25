import { http } from '@/app/plugins/axios'
import { keysToCamel, keysToSnake } from '@/shared/utils/casing'
import type { OverrideCapacityInput, SettingsGroupKey, SettingsGroupModelMap } from '../types'

/**
 * Endpoint prefix for this module. `settings` postdates the shared
 * `API_ENDPOINTS` map in `src/app/config/api.ts` and that file is outside
 * this module's territory (see CLAUDE.md's per-module mapper rule) — every
 * module owns its own endpoint strings rather than reaching into `app/`.
 *
 * This targets the Spatie settings system (`SpatieSettingsController`,
 * `/v1/settings/*`) per phase2-specs.md. The backend also has a separate,
 * older `admin/settings` controller (`SettingsController`) — out of scope
 * here; see WIRING.md.
 */
const SETTINGS_BASE = '/v1/settings'

interface SettingsIndexResponse {
  data: Record<SettingsGroupKey, Record<string, unknown>>
}
interface SettingsGroupResponse {
  data: Record<string, unknown>
}
interface OverrideCapacityResponse {
  data: { capacity_warning_threshold: number }
}

/**
 * Every Spatie settings group is a flat bag of scalars/arrays with no unions
 * to narrow and no fields the UI must withhold — unlike `faculties`/`users`,
 * which narrow a raw wire string onto a `status`/`role` union, nothing here
 * needs that. A generic snake<->camel walk is therefore safe: even
 * `per_role_enable_map`'s nested keys are plain role slugs (`super_admin`
 * etc.) that round-trip through the same camelCase convention as any other
 * key. The one place this module still narrows/validates is client-side, in
 * `SettingsGroupForm` and `SettingsTagsInput` (e.g. `ocr.languages` only
 * offers `ara`/`eng` as toggle chips).
 *
 * The per-group type is asserted at each call site below rather than proven
 * structurally — the same level of trust every module places in its
 * `*Resource` interfaces matching the real wire shape.
 */
function fromResource(raw: Record<string, unknown>): Record<string, unknown> {
  return keysToCamel(raw)
}

function toPayload(input: Record<string, unknown>): Record<string, unknown> {
  return keysToSnake(input)
}

export const settingsApi = {
  /** All 7 groups in one call — used to hydrate the tabbed settings page once on mount. */
  fetchAll: async (): Promise<{ [K in SettingsGroupKey]: SettingsGroupModelMap[K] }> => {
    const { data } = await http.get<SettingsIndexResponse>(SETTINGS_BASE)
    // Built as entries + `Object.fromEntries` rather than assigning into a
    // pre-typed accumulator: writing `result[key] = ...` for a union-typed
    // `key` makes TS require an intersection of every group's model, which
    // no single group's data satisfies. A single cast through `unknown` at
    // the end is the same trust boundary as every other module's
    // `fromResource`, applied once instead of per key.
    const entries = (Object.keys(data.data) as SettingsGroupKey[]).map(
      (key) => [key, fromResource(data.data[key])] as const,
    )
    return Object.fromEntries(entries) as unknown as {
      [K in SettingsGroupKey]: SettingsGroupModelMap[K]
    }
  },

  show: async <G extends SettingsGroupKey>(group: G): Promise<SettingsGroupModelMap[G]> => {
    const { data } = await http.get<SettingsGroupResponse>(`${SETTINGS_BASE}/${group}`)
    return fromResource(data.data) as unknown as SettingsGroupModelMap[G]
  },

  update: async <G extends SettingsGroupKey>(
    group: G,
    input: Partial<SettingsGroupModelMap[G]>,
  ): Promise<SettingsGroupModelMap[G]> => {
    const { data } = await http.patch<SettingsGroupResponse>(
      `${SETTINGS_BASE}/${group}`,
      toPayload(input),
    )
    return fromResource(data.data) as unknown as SettingsGroupModelMap[G]
  },

  reset: async <G extends SettingsGroupKey>(group: G): Promise<SettingsGroupModelMap[G]> => {
    const { data } = await http.post<SettingsGroupResponse>(`${SETTINGS_BASE}/reset/${group}`)
    return fromResource(data.data) as unknown as SettingsGroupModelMap[G]
  },

  /** Returns the new `capacityWarningThreshold` so the storage group can be patched locally. */
  overrideCapacity: async (input: OverrideCapacityInput): Promise<number> => {
    const { data } = await http.post<OverrideCapacityResponse>(
      `${SETTINGS_BASE}/storage/override-capacity`,
      { reason: input.reason, new_limit: input.newLimit },
    )
    return data.data.capacity_warning_threshold
  },
}
