<script setup lang="ts">
import { reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDialog from '@/shared/components/AppDialog.vue'
import type { OverrideCapacityInput } from '../types'

const props = defineProps<{
  open: boolean
  loading?: boolean
  /** Pre-fills the new-limit field with the group's current value. */
  currentThreshold?: number
}>()

const emit = defineEmits<{ close: []; save: [input: OverrideCapacityInput] }>()

const { t } = useI18n()

const form = reactive({ reason: '', newLimit: props.currentThreshold ?? 80 })
const errors = reactive({ reason: '', newLimit: '' })

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.reason = ''
    form.newLimit = props.currentThreshold ?? 80
    errors.reason = ''
    errors.newLimit = ''
  },
)

function validate(): boolean {
  errors.reason = form.reason.trim() ? '' : t('settings.overrideCapacity.errors.reasonRequired')
  errors.newLimit =
    form.newLimit >= 1 && form.newLimit <= 100
      ? ''
      : t('settings.overrideCapacity.errors.limitRange')
  return !errors.reason && !errors.newLimit
}

function submit(): void {
  if (!validate()) return
  emit('save', { reason: form.reason.trim(), newLimit: form.newLimit })
}
</script>

<template>
  <AppDialog
    :open="open"
    :title="t('settings.overrideCapacity.title')"
    size="sm"
    @close="emit('close')"
  >
    <p class="text-sm font-sans text-[#6F6F6F] mb-5">
      {{ t('settings.overrideCapacity.description') }}
    </p>

    <div class="flex flex-col gap-4">
      <div>
        <label class="block text-base font-sans text-text-primary mb-[7px]">
          {{ t('settings.overrideCapacity.newLimitLabel') }}
        </label>
        <input
          type="number"
          min="1"
          max="100"
          :value="form.newLimit"
          class="w-full bg-surface-card border border-border-input rounded-[9px] px-4 py-3 font-sans text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          @input="form.newLimit = Number(($event.target as HTMLInputElement).value)"
        />
        <p v-if="errors.newLimit" class="mt-1 text-xs text-danger">{{ errors.newLimit }}</p>
      </div>

      <div>
        <label class="block text-base font-sans text-text-primary mb-[7px]">
          {{ t('settings.overrideCapacity.reasonLabel') }}
        </label>
        <textarea
          v-model="form.reason"
          rows="3"
          :placeholder="t('settings.overrideCapacity.reasonPlaceholder')"
          class="w-full bg-surface-card border border-border-input rounded-[9px] px-4 py-3 font-sans text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
        />
        <p v-if="errors.reason" class="mt-1 text-xs text-danger">{{ errors.reason }}</p>
      </div>
    </div>

    <template #footer>
      <button
        type="button"
        class="px-[10.6px] py-[7px] rounded-[4px] bg-[#C0D4E9] text-sm font-sans font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
        :disabled="loading"
        @click="emit('close')"
      >
        {{ t('settings.overrideCapacity.cancel') }}
      </button>
      <button
        type="button"
        class="px-[10.6px] py-[7px] rounded-[4px] bg-primary-mid text-sm font-sans font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
        :disabled="loading"
        @click="submit"
      >
        {{ t('settings.overrideCapacity.confirm') }}
      </button>
    </template>
  </AppDialog>
</template>
