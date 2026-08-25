<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RotateCcw, Save, ShieldAlert } from 'lucide-vue-next'
import AppButton from '@/shared/components/AppButton.vue'
import AppErrorState from '@/shared/components/AppErrorState.vue'
import AppConfirmDialog from '@/shared/components/AppConfirmDialog.vue'
import { useToasts } from '@/shared/composables/useToasts'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import { useSettingsStore } from '../stores/useSettingsStore'
import SettingsGroupForm from '../components/SettingsGroupForm.vue'
import RoleEnableMapField from '../components/RoleEnableMapField.vue'
import OverrideCapacityDialog from '../components/OverrideCapacityDialog.vue'
import { SETTINGS_FIELDS } from '../settings-field-config'
import { SETTINGS_GROUP_KEYS } from '../types'
import type { NotificationRoleSlug, OverrideCapacityInput, SettingsGroupKey } from '../types'

const { t } = useI18n()
const toasts = useToasts()
const store = useSettingsStore()

const activeGroup = ref<SettingsGroupKey>('general')
const draft = ref<Record<string, unknown>>({})
const resetConfirmOpen = ref(false)
const overrideDialogOpen = ref(false)

onMounted(() => {
  void store.fetchAll()
})

// Re-sync the editable draft whenever the active tab changes or fresh data
// lands for it (initial load, after save/reset). Unsaved edits are
// discarded on tab switch — acceptable for a v1 admin settings screen with
// no autosave.
watch(
  () => [activeGroup.value, store.groups[activeGroup.value]] as const,
  ([, groupData]) => {
    draft.value = groupData ? { ...groupData } : {}
  },
  { immediate: true },
)

const tabs = computed(() =>
  SETTINGS_GROUP_KEYS.map((key) => ({ key, label: t(`settings.groups.${key}`) })),
)

async function handleSave(): Promise<void> {
  try {
    await store.save(activeGroup.value, draft.value)
    toasts.success(t('settings.toasts.saveSuccess'))
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('settings.toasts.saveError')))
  }
}

async function handleReset(): Promise<void> {
  try {
    await store.reset(activeGroup.value)
    toasts.success(t('settings.toasts.resetSuccess'))
    resetConfirmOpen.value = false
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('settings.toasts.resetError')))
  }
}

async function handleOverrideCapacity(input: OverrideCapacityInput): Promise<void> {
  try {
    await store.overrideCapacity(input)
    toasts.success(t('settings.toasts.overrideCapacitySuccess'))
    overrideDialogOpen.value = false
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('settings.toasts.overrideCapacityError')))
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-2xl font-display font-semibold text-text-primary">
        {{ t('settings.title') }}
      </h1>
      <p class="text-sm text-text-secondary font-sans mt-0.5">{{ t('settings.subtitle') }}</p>
    </div>

    <AppErrorState
      v-if="store.error"
      :description="store.error ?? undefined"
      @retry="store.fetchAll"
    />

    <div v-else class="flex gap-6 items-start">
      <!-- Group tabs -->
      <nav
        class="flex flex-col gap-1 w-[220px] shrink-0 bg-surface-card border border-border rounded-lg p-2"
      >
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="text-start px-3 py-2 rounded-md text-sm font-sans transition-colors"
          :class="
            activeGroup === tab.key
              ? 'bg-primary text-white font-medium'
              : 'text-text-secondary hover:bg-surface'
          "
          @click="activeGroup = tab.key"
        >
          {{ tab.label }}
        </button>
      </nav>

      <!-- Active group form -->
      <div class="flex-1 min-w-0 bg-surface-card border border-border rounded-lg p-6">
        <template v-if="store.loading">
          <div class="flex flex-col gap-4">
            <div v-for="i in 4" :key="i" class="h-10 bg-surface rounded animate-pulse" />
          </div>
        </template>
        <template v-else>
          <SettingsGroupForm v-model="draft" :fields="SETTINGS_FIELDS[activeGroup]">
            <template #field-perRoleEnableMap="{ model, update }">
              <RoleEnableMapField
                :model="model.perRoleEnableMap as Record<NotificationRoleSlug, boolean>"
                @update="update"
              />
            </template>
          </SettingsGroupForm>

          <div v-if="activeGroup === 'storage'" class="mt-5 pt-5 border-t border-border">
            <AppButton variant="ghost" size="sm" @click="overrideDialogOpen = true">
              <ShieldAlert class="w-4 h-4" />
              {{ t('settings.overrideCapacity.trigger') }}
            </AppButton>
          </div>

          <div class="flex items-center justify-end gap-3 mt-6 pt-5 border-t border-border">
            <AppButton
              variant="ghost"
              size="md"
              :disabled="store.saving"
              @click="resetConfirmOpen = true"
            >
              <RotateCcw class="w-4 h-4" />
              {{ t('settings.actions.reset') }}
            </AppButton>
            <AppButton variant="primary" size="md" :loading="store.saving" @click="handleSave">
              <Save class="w-4 h-4" />
              {{ t('settings.actions.save') }}
            </AppButton>
          </div>
        </template>
      </div>
    </div>

    <AppConfirmDialog
      :open="resetConfirmOpen"
      :title="t('settings.resetConfirm.title')"
      :confirm-label="t('settings.actions.reset')"
      confirm-class="bg-danger text-white hover:opacity-80"
      @close="resetConfirmOpen = false"
      @confirm="handleReset"
    >
      <p class="text-sm text-text-secondary font-sans">{{ t('settings.resetConfirm.message') }}</p>
    </AppConfirmDialog>

    <OverrideCapacityDialog
      :open="overrideDialogOpen"
      :loading="store.saving"
      :current-threshold="store.groups.storage?.capacityWarningThreshold"
      @close="overrideDialogOpen = false"
      @save="handleOverrideCapacity"
    />
  </div>
</template>
