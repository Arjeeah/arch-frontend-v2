<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Sparkles } from 'lucide-vue-next'
import AppEmptyState from '@/shared/components/AppEmptyState.vue'

const props = defineProps<{
  /** `structured_data` — `RefinementData::toArray()`, so snake_case keys. */
  data: Record<string, unknown> | null
  /** `additional_fields` — whatever the prompt asked for beyond the fixed six. */
  additionalFields: Record<string, unknown> | null
  loading?: boolean
}>()

const { t } = useI18n()

/**
 * The fixed half of `RefinementData`. `confidence` is deliberately absent — the
 * pipeline panel already renders it as a bar — and so is `additional_fields`,
 * which gets its own section below.
 */
const KNOWN_FIELDS = [
  'student_number',
  'student_name',
  'college',
  'program',
  'document_type',
  'enrollment_date',
] as const

/** The AI answers in free text, so a value can be anything JSON can hold. */
function display(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

const rows = computed(() =>
  KNOWN_FIELDS.map((key) => ({
    key,
    label: t(`studentDocuments.extraction.fields.${key}`),
    value: display(props.data?.[key]),
  })),
)

/**
 * Extra keys the prompt returned. `RefinementData::fromArray` sweeps anything
 * it does not recognise in here, so the shape is prompt-driven and open-ended.
 * // verify against live API
 */
const extraRows = computed(() =>
  Object.entries(props.additionalFields ?? {}).map(([key, value]) => ({
    key,
    value: display(value),
  })),
)

const hasData = computed(() => props.data !== null || extraRows.value.length > 0)
</script>

<template>
  <section class="rounded-[10px] border border-border bg-surface-card shadow-sm">
    <header class="flex items-center gap-2 border-b border-border px-5 py-4">
      <Sparkles class="h-4 w-4 text-primary" />
      <h2 class="font-display text-base font-semibold text-text-primary">
        {{ t('studentDocuments.extraction.title') }}
      </h2>
    </header>

    <p v-if="loading && !hasData" class="px-5 py-4 font-sans text-sm text-text-secondary">
      {{ t('studentDocuments.states.loading') }}
    </p>

    <AppEmptyState
      v-else-if="!hasData"
      compact
      :icon="Sparkles"
      :title="t('studentDocuments.extraction.emptyTitle')"
      :description="t('studentDocuments.extraction.emptyDescription')"
    />

    <div v-else class="flex flex-col gap-5 px-5 py-4">
      <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div v-for="row in rows" :key="row.key">
          <dt class="font-display text-xs text-text-muted">{{ row.label }}</dt>
          <dd class="break-words font-display text-sm font-semibold text-text-primary">
            {{ row.value }}
          </dd>
        </div>
      </dl>

      <div v-if="extraRows.length" class="border-t border-border pt-4">
        <p class="mb-2 font-display text-xs font-medium text-text-secondary">
          {{ t('studentDocuments.extraction.additional') }}
        </p>
        <dl class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div v-for="row in extraRows" :key="row.key" class="min-w-0">
            <dt class="break-words font-display text-xs text-text-muted">{{ row.key }}</dt>
            <dd class="break-words font-sans text-sm text-text-primary">{{ row.value }}</dd>
          </div>
        </dl>
      </div>
    </div>
  </section>
</template>
