// Types for the Settings module.
// These are the camelCase shapes the UI works with — `api/settingsApi.ts`
// maps them to/from the 7 `App\Settings\*` (Spatie laravel-settings) groups
// exposed through `SpatieSettingsController`.

export type SettingsGroupKey =
  | 'general'
  | 'storage'
  | 'borrowing'
  | 'ocr'
  | 'security'
  | 'notifications'
  | 'backup'

export const SETTINGS_GROUP_KEYS: readonly SettingsGroupKey[] = [
  'general',
  'storage',
  'borrowing',
  'ocr',
  'security',
  'notifications',
  'backup',
]

export interface GeneralSettingsModel {
  systemName: string
  /** 'ar' | 'en' — validated server-side as `in:ar,en`. */
  defaultLanguage: string
  /** IANA timezone identifier, e.g. `Africa/Tripoli` — validated server-side by Laravel's `timezone` rule. */
  timezone: string
  dateFormat: string
}

export interface StorageSettingsModel {
  /** Percentage, 1-100. */
  capacityWarningThreshold: number
  /** Megabytes. */
  maxFileSize: number
  allowedExtensions: string[]
}

export interface BorrowingSettingsModel {
  defaultDurationDays: number
  maxActivePerUser: number
  extensionLimit: number
}

export interface OcrSettingsModel {
  enabled: boolean
  /** Subset of `['ara', 'eng']` — the only values the backend accepts. */
  languages: string[]
  /** Percentage, 0-100. */
  confidenceThreshold: number
}

export interface SecuritySettingsModel {
  failedLoginLockoutCount: number
  /** Minutes. */
  sessionTimeout: number
  /** Pipe-delimited rule string, e.g. `min:8|mixed_case|numbers`. */
  passwordPolicy: string
}

/**
 * The three backend role slugs, camelCased, hardcoded here rather than
 * imported from `modules/auth` — cross-module imports are forbidden by the
 * boundaries rule, and this list is stable (`AUTH_ROLES` in
 * `modules/auth/types`).
 */
export const NOTIFICATION_ROLE_SLUGS = ['superAdmin', 'archivist', 'facultyStaff'] as const
export type NotificationRoleSlug = (typeof NOTIFICATION_ROLE_SLUGS)[number]

export interface NotificationsGroupSettingsModel {
  perRoleEnableMap: Record<NotificationRoleSlug, boolean>
  mailEnabled: boolean
}

export interface BackupSettingsModel {
  /** Cron expression, e.g. `0 2 * * *`. */
  scheduleCron: string
  retentionDays: number
  destinations: string[]
}

export interface SettingsGroupModelMap {
  general: GeneralSettingsModel
  storage: StorageSettingsModel
  borrowing: BorrowingSettingsModel
  ocr: OcrSettingsModel
  security: SecuritySettingsModel
  notifications: NotificationsGroupSettingsModel
  backup: BackupSettingsModel
}

/**
 * `POST /v1/settings/storage/override-capacity` payload. `newLimit` is
 * required by the backend even though phase2-specs.md's one-line summary
 * only mentions `{reason}` — verified against
 * `SpatieSettingsController::overrideCapacity()`'s inline `validate()` call.
 */
export interface OverrideCapacityInput {
  reason: string
  newLimit: number
}
