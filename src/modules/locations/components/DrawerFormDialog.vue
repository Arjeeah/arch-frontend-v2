<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDialog from '@/shared/components/AppDialog.vue'
import FormField from '@/shared/components/FormField.vue'
import FormInput from '@/shared/components/FormInput.vue'
import AppSelect from '@/shared/components/AppSelect.vue'
import type { Drawer, DrawerInput } from '../types'

const props = defineProps<{
  open: boolean
  drawer?: Drawer | null
  /** Display-only — the cabinet this drawer belongs to (or will belong to). Cabinet is fixed by the route, never submitted. */
  cabinetName: string
  saving?: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [input: DrawerInput]
}>()

const { t } = useI18n()

const isEdit = computed(() => !!props.drawer)

const form = reactive({
  number: '1',
  label: '',
  capacity: '100',
  status: 'active' as DrawerInput['status'],
})

const errors = reactive({ number: '', capacity: '' })

const statusOptions = computed(() => [
  { value: 'active', label: t('locations.common.statusActive') },
  { value: 'inactive', label: t('locations.common.statusInactive') },
])

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.number = String(props.drawer?.number ?? 1)
    form.label = props.drawer?.label ?? ''
    form.capacity = props.drawer?.capacity != null ? String(props.drawer.capacity) : '100'
    form.status = props.drawer?.status ?? 'active'
    errors.number = ''
    errors.capacity = ''
  },
)

function validate(): boolean {
  const number = Number(form.number)
  errors.number =
    Number.isInteger(number) && number >= 1 ? '' : t('locations.drawers.dialog.numberInvalid')

  // The update endpoint requires a positive capacity; create allows it blank
  // (server defaults to 100). See DrawerStoreRequest/DrawerUpdateRequest.
  if (isEdit.value || form.capacity.trim()) {
    const capacity = Number(form.capacity)
    errors.capacity =
      Number.isInteger(capacity) && capacity >= (isEdit.value ? 1 : 0)
        ? ''
        : t('locations.drawers.dialog.capacityInvalid')
  } else {
    errors.capacity = ''
  }

  return !errors.number && !errors.capacity
}

function submit() {
  if (!validate()) return
  emit('save', {
    number: Number(form.number),
    label: form.label.trim() ? form.label.trim() : null,
    capacity: form.capacity.trim() ? Number(form.capacity) : null,
    status: form.status,
  })
}
</script>

<template>
  <AppDialog
    :open="open"
    :title="
      isEdit ? t('locations.drawers.dialog.editTitle') : t('locations.drawers.dialog.createTitle')
    "
    size="md"
    @close="emit('close')"
  >
    <div class="flex flex-col gap-4">
      <p class="text-sm font-sans text-[#6F6F6F]">
        {{ t('locations.drawers.dialog.cabinetContext', { cabinet: cabinetName }) }}
      </p>

      <div class="grid grid-cols-2 gap-4">
        <FormField
          :label="t('locations.drawers.dialog.number')"
          field-id="drawer-number"
          :error="errors.number"
        >
          <FormInput id="drawer-number" v-model="form.number" type="number" />
        </FormField>
        <FormField
          :label="t('locations.drawers.dialog.capacity')"
          field-id="drawer-capacity"
          :error="errors.capacity"
        >
          <FormInput id="drawer-capacity" v-model="form.capacity" type="number" />
        </FormField>
      </div>

      <FormField :label="t('locations.drawers.dialog.label')" field-id="drawer-label">
        <FormInput
          id="drawer-label"
          v-model="form.label"
          :placeholder="t('locations.drawers.dialog.labelPlaceholder')"
        />
      </FormField>

      <FormField :label="t('locations.common.status')" field-id="drawer-status">
        <AppSelect id="drawer-status" v-model="form.status" :options="statusOptions" />
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
