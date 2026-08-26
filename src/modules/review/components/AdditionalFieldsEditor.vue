<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Trash2 } from 'lucide-vue-next'
import AppButton from '@/shared/components/AppButton.vue'

const props = withDefaults(
  defineProps<{
    /** Free-form bag from the extractor. Values are arbitrary JSON. */
    modelValue: Record<string, unknown>
    disabled?: boolean
  }>(),
  { disabled: false },
)

const emit = defineEmits<{ 'update:modelValue': [value: Record<string, unknown>] }>()

const { t } = useI18n()

interface EditorRow {
  id: number
  key: string
  /** Always a string for the input; re-parsed on the way out when needed. */
  raw: string
  /**
   * True when the original value was a plain string. Objects, arrays, numbers
   * and booleans round-trip through JSON so editing a nested value does not
   * quietly turn it into a string.
   */
  wasText: boolean
}

let nextRowId = 0
const rows = ref<EditorRow[]>([])

/**
 * Guard against the ping-pong between "parent pushed a new value" and "we just
 * emitted one" — without it, every keystroke would rebuild the rows and move
 * the caret.
 */
let lastEmitted = ''

function buildRows(source: Record<string, unknown>): EditorRow[] {
  return Object.entries(source).map(([key, value]) => ({
    id: ++nextRowId,
    key,
    raw: typeof value === 'string' ? value : JSON.stringify(value ?? null),
    wasText: typeof value === 'string',
  }))
}

function parseValue(row: EditorRow): unknown {
  if (row.wasText) return row.raw
  try {
    return JSON.parse(row.raw) as unknown
  } catch {
    // An operator mid-edit ("{ne" ) is not an error — keep the text as typed.
    return row.raw
  }
}

function serialize(): Record<string, unknown> {
  const next: Record<string, unknown> = {}
  for (const row of rows.value) {
    const key = row.key.trim()
    if (!key) continue
    next[key] = parseValue(row)
  }
  return next
}

function emitChange(): void {
  const next = serialize()
  lastEmitted = JSON.stringify(next)
  emit('update:modelValue', next)
}

watch(
  () => props.modelValue,
  (next) => {
    const incoming = JSON.stringify(next ?? {})
    if (incoming === lastEmitted) return
    lastEmitted = incoming
    rows.value = buildRows(next ?? {})
  },
  { immediate: true, deep: true },
)

function addRow(): void {
  rows.value = [...rows.value, { id: ++nextRowId, key: '', raw: '', wasText: true }]
}

function removeRow(id: number): void {
  rows.value = rows.value.filter((row) => row.id !== id)
  emitChange()
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center justify-between gap-2">
      <span class="font-sans text-sm font-medium text-text-primary">
        {{ t('review.form.additionalFields') }}
      </span>
      <AppButton variant="ghost" size="sm" :disabled="disabled" @click="addRow">
        <Plus class="h-4 w-4" />
        {{ t('review.form.addField') }}
      </AppButton>
    </div>

    <p v-if="!rows.length" class="font-sans text-xs text-text-muted">
      {{ t('review.form.noAdditionalFields') }}
    </p>

    <div v-for="row in rows" :key="row.id" class="flex items-center gap-2">
      <input
        v-model="row.key"
        type="text"
        :disabled="disabled"
        :placeholder="t('review.form.fieldKey')"
        :aria-label="t('review.form.fieldKey')"
        class="w-2/5 rounded-[9px] border border-border-input bg-surface-card px-3 py-2 font-sans text-sm text-text-primary placeholder:text-text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        @input="emitChange"
      />
      <input
        v-model="row.raw"
        type="text"
        :disabled="disabled"
        :placeholder="t('review.form.fieldValue')"
        :aria-label="t('review.form.fieldValue')"
        class="min-w-0 flex-1 rounded-[9px] border border-border-input bg-surface-card px-3 py-2 font-sans text-sm text-text-primary placeholder:text-text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        :class="row.wasText ? '' : 'font-mono text-xs'"
        @input="emitChange"
      />
      <button
        type="button"
        :disabled="disabled"
        class="shrink-0 rounded p-2 text-text-secondary transition-colors hover:bg-surface hover:text-danger disabled:opacity-50"
        :aria-label="t('review.form.removeField')"
        :title="t('review.form.removeField')"
        @click="removeRow(row.id)"
      >
        <Trash2 class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>
