// Per-group field configuration driving the generic `SettingsGroupForm`
// renderer. Field shapes come straight from the backend's `Update*SettingsRequest`
// validation rules (app/Http/Requests/Admin/Settings/*.php) — see each
// group's block below for the source rule.
import type { SettingsGroupKey } from './types'

export type SettingsFieldType = 'text' | 'number' | 'boolean' | 'select' | 'tags' | 'custom'

export interface SettingsSelectOption {
  value: string
  labelKey: string
}

export interface SettingsFieldConfig {
  key: string
  labelKey: string
  helperKey?: string
  type: SettingsFieldType
  min?: number
  max?: number
  step?: number
  /** `select` only. */
  options?: SettingsSelectOption[]
  /**
   * `tags` only: restricts entries to this fixed set, rendered as toggle
   * chips instead of a free-text chip input. Used for `ocr.languages`,
   * which the backend only accepts as `ara`/`eng`.
   */
  allowedValues?: SettingsSelectOption[]
}

/**
 * `type: 'custom'` is the one deliberate escape hatch from the five listed
 * types, used only for `notifications.perRoleEnableMap` (a nested
 * role -> boolean map, not a scalar). `SettingsGroupForm` renders it through
 * a named scoped slot (`#field-perRoleEnableMap`) that `SettingsPage`
 * fills with `RoleEnableMapField`; every other field in every other group
 * goes through the plain generic renderer.
 */
export const SETTINGS_FIELDS: Record<SettingsGroupKey, SettingsFieldConfig[]> = {
  // UpdateGeneralSettingsRequest
  general: [
    { key: 'systemName', labelKey: 'settings.fields.systemName', type: 'text' },
    {
      key: 'defaultLanguage',
      labelKey: 'settings.fields.defaultLanguage',
      type: 'select',
      options: [
        { value: 'ar', labelKey: 'settings.options.languageAr' },
        { value: 'en', labelKey: 'settings.options.languageEn' },
      ],
    },
    {
      key: 'timezone',
      labelKey: 'settings.fields.timezone',
      helperKey: 'settings.fields.timezoneHelper',
      type: 'text',
    },
    {
      key: 'dateFormat',
      labelKey: 'settings.fields.dateFormat',
      helperKey: 'settings.fields.dateFormatHelper',
      type: 'text',
    },
  ],
  // UpdateStorageSettingsRequest
  storage: [
    {
      key: 'capacityWarningThreshold',
      labelKey: 'settings.fields.capacityWarningThreshold',
      type: 'number',
      min: 1,
      max: 100,
    },
    {
      key: 'maxFileSize',
      labelKey: 'settings.fields.maxFileSize',
      helperKey: 'settings.fields.maxFileSizeHelper',
      type: 'number',
      min: 1,
    },
    { key: 'allowedExtensions', labelKey: 'settings.fields.allowedExtensions', type: 'tags' },
  ],
  // UpdateBorrowingSettingsRequest
  borrowing: [
    {
      key: 'defaultDurationDays',
      labelKey: 'settings.fields.defaultDurationDays',
      type: 'number',
      min: 1,
    },
    {
      key: 'maxActivePerUser',
      labelKey: 'settings.fields.maxActivePerUser',
      type: 'number',
      min: 1,
    },
    { key: 'extensionLimit', labelKey: 'settings.fields.extensionLimit', type: 'number', min: 0 },
  ],
  // UpdateOcrSettingsRequest
  ocr: [
    { key: 'enabled', labelKey: 'settings.fields.ocrEnabled', type: 'boolean' },
    {
      key: 'languages',
      labelKey: 'settings.fields.languages',
      type: 'tags',
      allowedValues: [
        { value: 'ara', labelKey: 'settings.options.languageAra' },
        { value: 'eng', labelKey: 'settings.options.languageEng' },
      ],
    },
    {
      key: 'confidenceThreshold',
      labelKey: 'settings.fields.confidenceThreshold',
      type: 'number',
      min: 0,
      max: 100,
      step: 0.1,
    },
  ],
  // UpdateSecuritySettingsRequest
  security: [
    {
      key: 'failedLoginLockoutCount',
      labelKey: 'settings.fields.failedLoginLockoutCount',
      type: 'number',
      min: 1,
      max: 20,
    },
    {
      key: 'sessionTimeout',
      labelKey: 'settings.fields.sessionTimeout',
      helperKey: 'settings.fields.sessionTimeoutHelper',
      type: 'number',
      min: 1,
    },
    {
      key: 'passwordPolicy',
      labelKey: 'settings.fields.passwordPolicy',
      helperKey: 'settings.fields.passwordPolicyHelper',
      type: 'text',
    },
  ],
  // UpdateNotificationSettingsRequest
  notifications: [
    { key: 'perRoleEnableMap', labelKey: 'settings.fields.perRoleEnableMap', type: 'custom' },
    { key: 'mailEnabled', labelKey: 'settings.fields.mailEnabled', type: 'boolean' },
  ],
  // UpdateBackupSettingsRequest
  backup: [
    {
      key: 'scheduleCron',
      labelKey: 'settings.fields.scheduleCron',
      helperKey: 'settings.fields.scheduleCronHelper',
      type: 'text',
    },
    { key: 'retentionDays', labelKey: 'settings.fields.retentionDays', type: 'number', min: 1 },
    { key: 'destinations', labelKey: 'settings.fields.destinations', type: 'tags' },
  ],
}
