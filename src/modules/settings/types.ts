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

/**
 * Groups the backend stores and validates but no code actually reads.
 *
 * Verified against `arch-backend/app/`: `BorrowingSettings`, `NotificationSettings`,
 * `StorageSettings` and `GeneralSettings` each have real consumers, but
 * `OcrSettings`, `SecuritySettings` and `BackupSettings` have zero outside their
 * own request/controller/settings classes. Saving them succeeds and changes
 * nothing, so the form is shown read-only with a notice rather than letting an
 * admin set an "OCR confidence threshold" or "session timeout" that the system
 * silently ignores. Remove a key from here the moment its settings class gains
 * a consumer.
 */
export const SETTINGS_GROUPS_NOT_ENFORCED: readonly SettingsGroupKey[] = [
  'ocr',
  'security',
  'backup',
]

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

/**
 * What `POST /v1/settings/storage/override-capacity` answers with.
 *
 * The distinction between the two numbers is the whole point of this endpoint
 * and is easy to lose: `threshold` is a **temporary** value held by
 * `StorageCapacityService` until `expiresAt`, while `persistedThreshold` is
 * `storage.capacity_warning_threshold` as stored — which the endpoint
 * deliberately does not touch, because writing it is super-admin-only through
 * `PATCH /v1/settings/storage` and this route is open to archivists too.
 *
 * Verified live: overriding to 95 answers
 * `{ capacity_warning_threshold: 95, expires_at: <+24h>, persisted_threshold: 80 }`
 * and a follow-up `GET /v1/settings/storage` still reports 80. Feeding
 * `threshold` back into the storage form would therefore show a value the
 * server does not hold, and one Save away from making the temporary override
 * permanent — which also clears it, since `update()` calls `clearOverride()`.
 */
export interface CapacityOverrideResult {
  /** The temporary effective threshold, 1-100. */
  threshold: number
  /** ISO-8601 instant the override lapses at. */
  expiresAt: string | null
  /** `storage.capacity_warning_threshold` as persisted — unchanged by this call. */
  persistedThreshold: number
}
