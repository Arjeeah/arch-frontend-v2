<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NOTIFICATION_ROLE_SLUGS } from '../types'
import type { NotificationRoleSlug } from '../types'

/**
 * Typed `unknown` and narrowed here rather than cast at the call site. The
 * slot hands over `draft.perRoleEnableMap`, a value off the generic
 * `Record<string, unknown>` draft, and it is genuinely absent on any render
 * where the notifications group has not landed yet (deep link to
 * `/settings/notifications`, a response missing the group) — indexing that in
 * the template would throw and blank the page. Casting in the template is not
 * an option either: a `|` union inside a template expression parses as Vue's
 * deprecated filter syntax and trips `vue/no-deprecated-filter`.
 */
const props = defineProps<{ model?: unknown }>()

const emit = defineEmits<{ update: [value: Record<NotificationRoleSlug, boolean>] }>()

const { t } = useI18n()

/**
 * The settings payload keys this map in camelCase (`perRoleEnableMap`), but
 * role labels live under `common.roles.*` keyed by the backend slug — the one
 * set `/dashboard`, `/users`, `/reports` and this screen now share. Four
 * different Arabic names for `super_admin` were in circulation before.
 */
const ROLE_LABEL_KEY: Record<NotificationRoleSlug, string> = {
  superAdmin: 'super_admin',
  archivist: 'archivist',
  facultyStaff: 'faculty_staff',
}

function readFlag(map: unknown, role: NotificationRoleSlug): boolean {
  if (typeof map !== 'object' || map === null) return false
  return (map as Record<string, unknown>)[role] === true
}

const current = computed<Record<NotificationRoleSlug, boolean>>(() => ({
  superAdmin: readFlag(props.model, 'superAdmin'),
  archivist: readFlag(props.model, 'archivist'),
  facultyStaff: readFlag(props.model, 'facultyStaff'),
}))

function toggle(role: NotificationRoleSlug): void {
  emit('update', { ...current.value, [role]: !current.value[role] })
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <p class="text-base font-sans text-text-primary">{{ t('settings.fields.perRoleEnableMap') }}</p>
    <p class="text-xs text-text-secondary mb-2">
      {{ t('settings.fields.perRoleEnableMapHelper') }}
    </p>
    <div
      class="flex flex-col divide-y divide-border border border-border rounded-lg overflow-hidden"
    >
      <div
        v-for="role in NOTIFICATION_ROLE_SLUGS"
        :key="role"
        class="flex items-center justify-between px-4 py-2.5 bg-white"
      >
        <span class="text-sm font-sans text-text-primary">
          {{ t(`common.roles.${ROLE_LABEL_KEY[role]}`) }}
        </span>
        <!-- Logical `start-*` inset, not `translate-x-*`: a physical transform
             does not flip under `dir="rtl"`, which left the knob rendering
             outside the track in Arabic. Same fix as `SettingsGroupForm`. -->
        <button
          type="button"
          class="relative inline-flex h-[22px] w-[40px] rounded-[16px] transition-colors focus:outline-none"
          :class="current[role] ? 'bg-primary-light' : 'bg-border'"
          @click="toggle(role)"
        >
          <span
            class="absolute top-[3px] h-[16px] w-[16px] rounded-[16px] bg-white shadow-sm transition-all"
            :class="current[role] ? 'start-[22px]' : 'start-[2px]'"
          />
        </button>
      </div>
    </div>
  </div>
</template>
