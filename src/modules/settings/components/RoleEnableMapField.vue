<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { NOTIFICATION_ROLE_SLUGS } from '../types'
import type { NotificationRoleSlug } from '../types'

defineProps<{ model: Record<NotificationRoleSlug, boolean> }>()

const emit = defineEmits<{ update: [value: Record<NotificationRoleSlug, boolean>] }>()

const { t } = useI18n()

function toggle(role: NotificationRoleSlug, current: Record<NotificationRoleSlug, boolean>): void {
  emit('update', { ...current, [role]: !current[role] })
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
          {{ t(`settings.options.role.${role}`) }}
        </span>
        <button
          type="button"
          class="relative inline-flex h-[22px] w-[40px] items-center rounded-[16px] transition-colors focus:outline-none"
          :class="model[role] ? 'bg-primary-light' : 'bg-border'"
          @click="toggle(role, model)"
        >
          <span
            class="inline-block h-[16px] w-[16px] transform rounded-[16px] bg-white shadow-sm transition-transform"
            :class="model[role] ? 'translate-x-[20px]' : 'translate-x-[2px]'"
          />
        </button>
      </div>
    </div>
  </div>
</template>
