<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDialog from '@/shared/components/AppDialog.vue'
import FormField from '@/shared/components/FormField.vue'
import FormInput from '@/shared/components/FormInput.vue'
import AppSelect from '@/shared/components/AppSelect.vue'
import type { Cabinet, CabinetInput } from '../types'

const props = defineProps<{
  open: boolean
  cabinet?: Cabinet | null
  /** Display-only — the room this cabinet belongs to (or will belong to). Room is fixed by the route, never submitted. */
  roomName: string
  saving?: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [input: CabinetInput]
}>()

const { t } = useI18n()

const isEdit = computed(() => !!props.cabinet)

const form = reactive({
  name: '',
  positionX: '0',
  positionY: '0',
  status: 'active' as CabinetInput['status'],
})

const errors = reactive({ name: '', positionX: '', positionY: '' })

const statusOptions = computed(() => [
  { value: 'active', label: t('locations.common.statusActive') },
  { value: 'inactive', label: t('locations.common.statusInactive') },
])

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.name = props.cabinet?.name ?? ''
    form.positionX = String(props.cabinet?.positionX ?? 0)
    form.positionY = String(props.cabinet?.positionY ?? 0)
    form.status = props.cabinet?.status ?? 'active'
    errors.name = ''
    errors.positionX = ''
    errors.positionY = ''
  },
)

function validate(): boolean {
  errors.name = form.name.trim() ? '' : t('locations.cabinets.dialog.nameRequired')
  errors.positionX = Number.isFinite(Number(form.positionX))
    ? ''
    : t('locations.cabinets.dialog.positionInvalid')
  errors.positionY = Number.isFinite(Number(form.positionY))
    ? ''
    : t('locations.cabinets.dialog.positionInvalid')
  return !errors.name && !errors.positionX && !errors.positionY
}

function submit() {
  if (!validate()) return
  emit('save', {
    name: form.name.trim(),
    positionX: Number(form.positionX),
    positionY: Number(form.positionY),
    status: form.status,
  })
}
</script>

<template>
  <AppDialog
    :open="open"
    :title="
      isEdit ? t('locations.cabinets.dialog.editTitle') : t('locations.cabinets.dialog.createTitle')
    "
    size="md"
    @close="emit('close')"
  >
    <div class="flex flex-col gap-4">
      <p class="text-sm font-sans text-[#6F6F6F]">
        {{ t('locations.cabinets.dialog.roomContext', { room: roomName }) }}
      </p>

      <FormField :label="t('locations.common.name')" field-id="cabinet-name" :error="errors.name">
        <FormInput
          id="cabinet-name"
          v-model="form.name"
          :placeholder="t('locations.cabinets.dialog.namePlaceholder')"
        />
      </FormField>

      <div class="grid grid-cols-2 gap-4">
        <FormField
          :label="t('locations.cabinets.dialog.positionX')"
          field-id="cabinet-position-x"
          :error="errors.positionX"
        >
          <FormInput id="cabinet-position-x" v-model="form.positionX" type="number" />
        </FormField>
        <FormField
          :label="t('locations.cabinets.dialog.positionY')"
          field-id="cabinet-position-y"
          :error="errors.positionY"
        >
          <FormInput id="cabinet-position-y" v-model="form.positionY" type="number" />
        </FormField>
      </div>

      <FormField :label="t('locations.common.status')" field-id="cabinet-status">
        <AppSelect id="cabinet-status" v-model="form.status" :options="statusOptions" />
      </FormField>

      <p v-if="!isEdit" class="text-xs text-text-muted font-sans">
        {{ t('locations.cabinets.dialog.autoDrawersHint') }}
      </p>
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
