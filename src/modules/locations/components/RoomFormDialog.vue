<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDialog from '@/shared/components/AppDialog.vue'
import FormField from '@/shared/components/FormField.vue'
import FormInput from '@/shared/components/FormInput.vue'
import AppSelect from '@/shared/components/AppSelect.vue'
import type { Room, RoomInput } from '../types'

const props = defineProps<{
  open: boolean
  room?: Room | null
  saving?: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [input: RoomInput]
}>()

const { t } = useI18n()

const isEdit = computed(() => !!props.room)

const form = reactive({
  name: '',
  description: '',
  status: 'active' as RoomInput['status'],
})

const errors = reactive({ name: '' })

const statusOptions = computed(() => [
  { value: 'active', label: t('locations.common.statusActive') },
  { value: 'inactive', label: t('locations.common.statusInactive') },
])

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.name = props.room?.name ?? ''
    form.description = props.room?.description ?? ''
    form.status = props.room?.status ?? 'active'
    errors.name = ''
  },
)

function validate(): boolean {
  errors.name = form.name.trim() ? '' : t('locations.rooms.dialog.nameRequired')
  return !errors.name
}

function submit() {
  if (!validate()) return
  emit('save', {
    name: form.name.trim(),
    description: form.description.trim() ? form.description.trim() : null,
    status: form.status,
  })
}
</script>

<template>
  <AppDialog
    :open="open"
    :title="
      isEdit ? t('locations.rooms.dialog.editTitle') : t('locations.rooms.dialog.createTitle')
    "
    size="md"
    @close="emit('close')"
  >
    <div class="flex flex-col gap-4">
      <FormField :label="t('locations.common.name')" field-id="room-name" :error="errors.name">
        <FormInput
          id="room-name"
          v-model="form.name"
          :placeholder="t('locations.rooms.dialog.namePlaceholder')"
        />
      </FormField>

      <FormField :label="t('locations.common.description')" field-id="room-description">
        <textarea
          id="room-description"
          v-model="form.description"
          rows="3"
          :placeholder="t('locations.rooms.dialog.descriptionPlaceholder')"
          class="w-full resize-none rounded-[9px] border border-border-input bg-surface-card px-4 py-3 font-sans text-sm text-text-primary placeholder:font-display placeholder:font-light placeholder:text-text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </FormField>

      <FormField :label="t('locations.common.status')" field-id="room-status">
        <AppSelect id="room-status" v-model="form.status" :options="statusOptions" />
      </FormField>
    </div>

    <template #footer>
      <button
        type="button"
        class="rounded-[4px] bg-[#C0D4E9] px-[10.6px] py-[7px] text-sm font-sans font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
        :disabled="saving"
        @click="emit('close')"
      >
        {{ t('locations.common.cancel') }}
      </button>
      <button
        type="button"
        class="rounded-[4px] bg-primary-mid px-[10.6px] py-[7px] text-sm font-sans font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
        :disabled="saving"
        @click="submit"
      >
        {{ isEdit ? t('locations.common.saveChanges') : t('locations.common.create') }}
      </button>
    </template>
  </AppDialog>
</template>
