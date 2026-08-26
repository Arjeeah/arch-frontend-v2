<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDown, LoaderCircle, X } from 'lucide-vue-next'
import { useDebouncedRef } from '@/shared/composables/useDebouncedRef'

interface AsyncSelectOption {
  value: string
  label: string
}

const props = withDefaults(
  defineProps<{
    /** Currently selected option, or `null`. Use with `v-model`. */
    modelValue: AsyncSelectOption | null
    /** Called with the trimmed query once it is at least `minChars` long. */
    searchFn: (query: string) => Promise<AsyncSelectOption[]>
    placeholder?: string
    /** Minimum characters before the first request goes out. */
    minChars?: number
    debounceMs?: number
    disabled?: boolean
    clearable?: boolean
    id?: string
    loadingText?: string
    emptyText?: string
    errorText?: string
    /** `{n}` is replaced with `minChars`. */
    minCharsText?: string
    clearLabel?: string
  }>(),
  {
    placeholder: undefined,
    minChars: 2,
    debounceMs: 300,
    disabled: false,
    clearable: true,
    id: undefined,
    loadingText: undefined,
    emptyText: undefined,
    errorText: undefined,
    minCharsText: undefined,
    clearLabel: undefined,
  },
)

const emit = defineEmits<{ 'update:modelValue': [option: AsyncSelectOption | null] }>()

const { t } = useI18n()

/**
 * Every text prop falls back to a translated default. They used to be English
 * literals, which every production call site happened to override — a trap for
 * the next caller rather than a live defect.
 */
const placeholderText = computed(() => props.placeholder ?? t('common.searchPlaceholder'))
const loadingLabel = computed(() => props.loadingText ?? t('common.searching'))
const emptyLabel = computed(() => props.emptyText ?? t('common.noResults'))
const errorLabel = computed(() => props.errorText ?? t('common.loadResultsFailed'))
const clearText = computed(() => props.clearLabel ?? t('common.clearSelection'))
const minCharsLabel = computed(() =>
  props.minCharsText
    ? props.minCharsText.replace('{n}', String(props.minChars))
    : t('common.typeAtLeast', { n: props.minChars }),
)

const listboxId = `async-select-${useId()}`
const rootRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const listRef = ref<HTMLUListElement | null>(null)

const query = ref(props.modelValue?.label ?? '')
const open = ref(false)
const options = ref<AsyncSelectOption[]>([])
const loading = ref(false)
const failed = ref(false)
const highlighted = ref(-1)

const debouncedQuery = useDebouncedRef(query, props.debounceMs)
let requestId = 0

async function runSearch(raw: string): Promise<void> {
  const term = raw.trim()
  if (term.length < props.minChars) {
    requestId++
    options.value = []
    highlighted.value = -1
    loading.value = false
    failed.value = false
    return
  }

  const currentRequest = ++requestId
  loading.value = true
  failed.value = false
  try {
    const result = await props.searchFn(term)
    if (currentRequest !== requestId) return
    options.value = result
    highlighted.value = result.length > 0 ? 0 : -1
  } catch {
    if (currentRequest !== requestId) return
    options.value = []
    highlighted.value = -1
    failed.value = true
  } finally {
    if (currentRequest === requestId) loading.value = false
  }
}

watch(debouncedQuery, (value) => {
  /*
   * Picking an option, closing the list and an external `modelValue` change
   * all write the selected label into `query`. With the list closed there is
   * nothing to show, so searching for it would be a round-trip whose results
   * are discarded. Typing keeps the list open, so a real search still runs
   * even when the typed text happens to equal the current selection.
   */
  if (!open.value && value === props.modelValue?.label) return
  void runSearch(value)
})

watch(
  () => props.modelValue,
  (option) => {
    query.value = option?.label ?? ''
  },
)

function select(option: AsyncSelectOption): void {
  emit('update:modelValue', option)
  query.value = option.label
  open.value = false
  options.value = []
  highlighted.value = -1
}

function clear(): void {
  if (props.disabled) return
  requestId++
  emit('update:modelValue', null)
  query.value = ''
  options.value = []
  highlighted.value = -1
  failed.value = false
  inputRef.value?.focus()
}

function close(): void {
  open.value = false
  // Restore the selected label when the user typed without picking anything.
  query.value = props.modelValue?.label ?? ''
}

function onInput(event: Event): void {
  query.value = (event.target as HTMLInputElement).value
  open.value = true
  failed.value = false
}

function move(delta: number): void {
  if (options.value.length === 0) return
  const count = options.value.length
  highlighted.value = (highlighted.value + delta + count) % count
  void nextTick(() => {
    listRef.value?.children[highlighted.value]?.scrollIntoView({ block: 'nearest' })
  })
}

function onKeydown(event: KeyboardEvent): void {
  if (props.disabled) return

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (!open.value) {
      open.value = true
      void runSearch(query.value)
      return
    }
    move(1)
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    move(-1)
    return
  }

  if (event.key === 'Enter') {
    const option = options.value[highlighted.value]
    if (open.value && option) {
      event.preventDefault()
      select(option)
    }
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    close()
  }
}

function onClickOutside(event: MouseEvent): void {
  if (!open.value) return
  if (rootRef.value && !rootRef.value.contains(event.target as Node)) close()
}

onMounted(() => document.addEventListener('mousedown', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', onClickOutside))
</script>

<template>
  <div ref="rootRef" class="relative font-sans">
    <div class="relative">
      <input
        :id="id"
        ref="inputRef"
        :value="query"
        type="text"
        role="combobox"
        autocomplete="off"
        :placeholder="placeholderText"
        :disabled="disabled"
        :aria-expanded="open"
        :aria-controls="listboxId"
        aria-haspopup="listbox"
        :aria-activedescendant="highlighted >= 0 ? `${listboxId}-${highlighted}` : undefined"
        class="w-full rounded-[9px] border border-border-input bg-surface-card px-4 py-3 pe-10 text-sm text-text-primary placeholder:font-display placeholder:font-light placeholder:text-text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        @input="onInput"
        @focus="open = true"
        @keydown="onKeydown"
      />
      <button
        v-if="clearable && modelValue && !disabled"
        type="button"
        class="absolute end-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-text-secondary transition-colors hover:text-text-primary"
        :aria-label="clearText"
        @click="clear"
      >
        <X class="h-4 w-4" />
      </button>
      <LoaderCircle
        v-else-if="loading"
        class="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-text-secondary"
      />
      <ChevronDown
        v-else
        class="pointer-events-none absolute end-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary"
      />
    </div>

    <div
      v-if="open"
      class="absolute z-40 mt-1 w-full overflow-hidden rounded-[9px] border border-border bg-surface-card shadow-[4px_4px_4px_rgba(0,0,0,0.10)]"
    >
      <p v-if="loading" class="flex items-center gap-2 px-4 py-3 text-sm text-text-secondary">
        <LoaderCircle class="h-4 w-4 animate-spin" />
        {{ loadingLabel }}
      </p>
      <p v-else-if="failed" class="px-4 py-3 text-sm text-danger">{{ errorLabel }}</p>
      <p
        v-else-if="query.trim().length < minChars"
        class="px-4 py-3 text-sm text-text-secondary"
        role="status"
      >
        {{ minCharsLabel }}
      </p>
      <p
        v-else-if="options.length === 0"
        class="px-4 py-3 text-sm text-text-secondary"
        role="status"
      >
        {{ emptyLabel }}
      </p>
      <ul v-else :id="listboxId" ref="listRef" role="listbox" class="max-h-60 overflow-y-auto py-1">
        <li
          v-for="(option, index) in options"
          :id="`${listboxId}-${index}`"
          :key="option.value"
          role="option"
          :aria-selected="modelValue?.value === option.value"
          class="cursor-pointer px-4 py-2 text-start text-sm text-text-primary"
          :class="index === highlighted ? 'bg-highlight' : 'hover:bg-surface'"
          @mouseenter="highlighted = index"
          @mousedown.prevent="select(option)"
        >
          {{ option.label }}
        </li>
      </ul>
    </div>
  </div>
</template>
