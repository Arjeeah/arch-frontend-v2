<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RotateCcw, SlidersHorizontal, TriangleAlert } from 'lucide-vue-next'
import AppSelect from '@/shared/components/AppSelect.vue'
import {
  LIMIT_OPTIONS,
  STUDENT_STATUSES,
  type LookupOption,
  type SearchFilters,
  type StudentStatus,
} from '../types'

/**
 * Optional narrowing for a search: faculty, program, student status and how many
 * rows to ask for. Values are emitted as ids/nulls; `AppSelect` speaks strings,
 * so the conversion happens here rather than leaking into the store.
 */
const props = defineProps<{
  filters: SearchFilters
  limit: number
  faculties: LookupOption[]
  programs: LookupOption[]
  loading: boolean
  /** Message from a failed faculty/program lookup; null when they loaded. */
  error?: string | null
}>()

const emit = defineEmits<{
  'update:faculty': [value: number | null]
  'update:program': [value: number | null]
  'update:status': [value: StudentStatus | null]
  'update:limit': [value: number]
  reset: []
  'retry-lookups': []
}>()

const { t, locale } = useI18n()

/** Result rows carry Arabic names, so the selects follow the UI locale. */
function optionLabel(option: LookupOption): string {
  return locale.value === 'ar' ? option.nameAr : option.nameEn || option.nameAr
}

function toOptions(rows: LookupOption[]): { value: string; label: string }[] {
  return rows.map((row) => ({ value: String(row.id), label: optionLabel(row) }))
}

const facultyOptions = computed(() => toOptions(props.faculties))
const programOptions = computed(() => toOptions(props.programs))

const statusOptions = computed(() =>
  STUDENT_STATUSES.map((status) => ({ value: status, label: t(`search.status.${status}`) })),
)

const limitOptions = computed(() =>
  LIMIT_OPTIONS.map((value) => ({
    value: String(value),
    label: t('search.filters.limitOption', { count: value }),
  })),
)

const facultyValue = computed(() =>
  props.filters.facultyId === null ? '' : String(props.filters.facultyId),
)
const programValue = computed(() =>
  props.filters.programId === null ? '' : String(props.filters.programId),
)
const statusValue = computed(() => props.filters.studentStatus ?? '')

const hasFilters = computed(
  () =>
    props.filters.facultyId !== null ||
    props.filters.programId !== null ||
    props.filters.studentStatus !== null,
)

/** `''` is the placeholder option, which means "no filter". */
function toId(value: string): number | null {
  return value === '' ? null : Number(value)
}

function onStatus(value: string): void {
  emit('update:status', value === '' ? null : (value as StudentStatus))
}
</script>

<template>
  <section class="flex flex-col gap-3 rounded-xl border border-border bg-surface-card p-4">
    <div class="flex items-center justify-between gap-3">
      <h2
        class="inline-flex items-center gap-2 font-display text-sm font-semibold text-text-primary"
      >
        <SlidersHorizontal class="h-4 w-4 text-text-secondary" />
        {{ t('search.filters.title') }}
      </h2>
      <button
        v-if="hasFilters"
        type="button"
        class="inline-flex items-center gap-1.5 font-sans text-xs font-medium text-primary hover:opacity-80"
        @click="emit('reset')"
      >
        <RotateCcw class="h-3.5 w-3.5" />
        {{ t('search.filters.reset') }}
      </button>
    </div>

    <!--
      A failed lookup is not fatal — the query still runs unfiltered — so this
      is an inline notice with a retry rather than an AppErrorState that would
      replace the whole bar.
    -->
    <p
      v-if="props.error"
      class="flex flex-wrap items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 font-sans text-xs text-text-secondary"
    >
      <TriangleAlert class="h-3.5 w-3.5 shrink-0 text-warning" />
      {{ t('search.filters.loadFailed') }}
      <button
        type="button"
        class="font-medium text-primary underline underline-offset-2 hover:opacity-80"
        @click="emit('retry-lookups')"
      >
        {{ t('search.filters.retryLookups') }}
      </button>
    </p>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <label class="flex flex-col gap-1.5">
        <span class="font-display text-xs font-medium text-text-secondary">
          {{ t('search.filters.faculty') }}
        </span>
        <AppSelect
          :model-value="facultyValue"
          :options="facultyOptions"
          :placeholder="loading ? t('search.filters.loading') : t('search.filters.allFaculties')"
          @update:model-value="emit('update:faculty', toId($event))"
        />
      </label>

      <label class="flex flex-col gap-1.5">
        <span class="font-display text-xs font-medium text-text-secondary">
          {{ t('search.filters.program') }}
        </span>
        <AppSelect
          :model-value="programValue"
          :options="programOptions"
          :placeholder="loading ? t('search.filters.loading') : t('search.filters.allPrograms')"
          @update:model-value="emit('update:program', toId($event))"
        />
      </label>

      <label class="flex flex-col gap-1.5">
        <span class="font-display text-xs font-medium text-text-secondary">
          {{ t('search.filters.status') }}
        </span>
        <AppSelect
          :model-value="statusValue"
          :options="statusOptions"
          :placeholder="t('search.filters.allStatuses')"
          @update:model-value="onStatus"
        />
      </label>

      <label class="flex flex-col gap-1.5">
        <span class="font-display text-xs font-medium text-text-secondary">
          {{ t('search.filters.limit') }}
        </span>
        <AppSelect
          :model-value="String(props.limit)"
          :options="limitOptions"
          @update:model-value="emit('update:limit', Number($event))"
        />
      </label>
    </div>
  </section>
</template>
