<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { usersApi } from '../api/usersApi'
import type { FacultyOption } from '../api/usersApi'

const props = withDefaults(
  defineProps<{
    /** Selected faculty ids. */
    modelValue: number[]
    disabled?: boolean
  }>(),
  { disabled: false },
)

const emit = defineEmits<{ 'update:modelValue': [ids: number[]] }>()

const { t } = useI18n()

const options = ref<FacultyOption[]>([])
const loading = ref(false)
const loadFailed = ref(false)

async function load() {
  loading.value = true
  loadFailed.value = false
  try {
    options.value = await usersApi.facultyOptions()
  } catch {
    loadFailed.value = true
  } finally {
    loading.value = false
  }
}

onMounted(load)

function toggle(id: number) {
  if (props.disabled) return
  const next = props.modelValue.includes(id)
    ? props.modelValue.filter((v) => v !== id)
    : [...props.modelValue, id]
  emit('update:modelValue', next)
}
</script>

<template>
  <div>
    <div v-if="loading" class="flex flex-wrap gap-2">
      <div v-for="i in 4" :key="i" class="h-7 w-24 rounded-full bg-surface animate-pulse" />
    </div>

    <div v-else-if="loadFailed" class="flex items-center gap-2">
      <p class="text-xs text-danger">{{ t('users.facultyPicker.loadError') }}</p>
      <button
        type="button"
        class="text-xs font-display font-medium text-primary hover:underline"
        @click="load"
      >
        {{ t('users.facultyPicker.retry') }}
      </button>
    </div>

    <p v-else-if="!options.length" class="text-xs text-text-muted">
      {{ t('users.facultyPicker.empty') }}
    </p>

    <div v-else class="flex flex-wrap gap-2">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        :disabled="disabled"
        :aria-pressed="modelValue.includes(option.value)"
        class="rounded-full border px-3 py-1.5 text-xs font-display font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        :class="
          modelValue.includes(option.value)
            ? 'border-primary bg-primary text-white'
            : 'border-border-dropdown bg-white text-text-secondary hover:border-primary'
        "
        @click="toggle(option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>
