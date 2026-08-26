<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CloudUpload, FileText, Trash2 } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    /** Current selection. Use with `v-model:files`. */
    files: File[]
    /** Same syntax as the native input: `.pdf,.docx,image/*`. Empty = anything. */
    accept?: string
    /** Per-file size limit in megabytes. Omit for no limit. */
    maxSizeMb?: number
    /** Maximum number of files kept in the selection. Omit for no limit. */
    maxFiles?: number
    multiple?: boolean
    disabled?: boolean
    /**
     * Upload progress per file (0–100), keyed by `file.name`.
     * Wire it up once the upload endpoint exists; omit for a plain picker.
     */
    progress?: Record<string, number>
    label?: string
    hint?: string
    browseLabel?: string
    removeLabel?: string
  }>(),
  {
    accept: '',
    maxSizeMb: undefined,
    maxFiles: undefined,
    multiple: true,
    disabled: false,
    progress: undefined,
    label: undefined,
    hint: '',
    browseLabel: undefined,
    removeLabel: undefined,
  },
)

const emit = defineEmits<{
  'update:files': [files: File[]]
  /** Fired with the human-readable reasons whenever files are rejected. */
  error: [messages: string[]]
}>()

const { t } = useI18n()

/**
 * Labels and rejection reasons default to translated strings. They used to be
 * English literals baked into the component, which every module inherited: a
 * page could translate its own copy around the picker but not the picker's own
 * text or the reasons it emitted through `error`.
 */
const dropLabel = computed(() => props.label ?? t('common.fileDropLabel'))
const browseText = computed(() => props.browseLabel ?? t('common.fileBrowse'))
const removeText = computed(() => props.removeLabel ?? t('common.fileRemove'))

const inputRef = ref<HTMLInputElement | null>(null)
const dragDepth = ref(0)
const errors = ref<string[]>([])

const isDragging = computed(() => dragDepth.value > 0 && !props.disabled)

const hintText = computed(() => {
  if (props.hint) return props.hint
  const parts: string[] = []
  if (props.accept) parts.push(props.accept.split(',').join(', '))
  if (props.maxSizeMb !== undefined) parts.push(t('common.fileHintSize', { max: props.maxSizeMb }))
  if (props.maxFiles !== undefined)
    parts.push(t('common.fileHintCount', { max: props.maxFiles }, props.maxFiles))
  return parts.join(' · ')
})

/** Clamped upload progress for a file, or `undefined` when none was supplied. */
function progressFor(file: File): number | undefined {
  const value = props.progress?.[file.name]
  return value === undefined ? undefined : Math.min(100, Math.max(0, value))
}

function fileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function matchesAccept(file: File): boolean {
  const patterns = props.accept
    .split(',')
    .map((pattern) => pattern.trim().toLowerCase())
    .filter(Boolean)
  if (patterns.length === 0) return true

  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  return patterns.some((pattern) => {
    if (pattern.startsWith('.')) return name.endsWith(pattern)
    if (pattern.endsWith('/*')) return type.startsWith(pattern.slice(0, -1))
    return type === pattern
  })
}

function addFiles(incoming: File[]): void {
  if (props.disabled || incoming.length === 0) return

  const rejected: string[] = []
  const accepted = props.multiple ? [...props.files] : []
  const seen = new Set(accepted.map(fileKey))

  for (const file of incoming) {
    if (seen.has(fileKey(file))) {
      rejected.push(t('common.fileAlreadySelected', { name: file.name }))
      continue
    }
    if (!matchesAccept(file)) {
      rejected.push(t('common.fileTypeRejected', { name: file.name }))
      continue
    }
    if (props.maxSizeMb !== undefined && file.size > props.maxSizeMb * 1024 * 1024) {
      rejected.push(t('common.fileTooLarge', { name: file.name, max: props.maxSizeMb }))
      continue
    }
    if (props.maxFiles !== undefined && accepted.length >= props.maxFiles) {
      rejected.push(
        t('common.fileCountExceeded', { name: file.name, max: props.maxFiles }, props.maxFiles),
      )
      continue
    }
    accepted.push(file)
    seen.add(fileKey(file))
    if (!props.multiple) break
  }

  errors.value = rejected
  if (rejected.length > 0) emit('error', rejected)

  // Single-file mode starts `accepted` empty, so a rejected drop would emit
  // `[]` and silently discard a perfectly good earlier selection. Nothing was
  // accepted, so there is nothing to update — leave the current file alone.
  if (accepted.length === 0 && rejected.length > 0) return

  if (accepted.length !== props.files.length || accepted.some((f, i) => f !== props.files[i])) {
    emit('update:files', accepted)
  }
}

function openPicker(): void {
  if (props.disabled) return
  inputRef.value?.click()
}

function onInputChange(event: Event): void {
  const input = event.target as HTMLInputElement
  addFiles(Array.from(input.files ?? []))
  // Allow picking the same file again after removing it.
  input.value = ''
}

function onDrop(event: DragEvent): void {
  dragDepth.value = 0
  if (props.disabled) return
  addFiles(Array.from(event.dataTransfer?.files ?? []))
}

function removeFile(index: number): void {
  const next = props.files.filter((_, i) => i !== index)
  errors.value = []
  emit('update:files', next)
}
</script>

<template>
  <div class="font-sans">
    <div
      class="flex flex-col items-center justify-center gap-2 rounded-[10px] border-2 border-dashed px-6 py-8 text-center transition-colors"
      :class="[
        isDragging ? 'border-primary bg-highlight/40' : 'border-border bg-surface',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-primary',
      ]"
      role="button"
      tabindex="0"
      :aria-disabled="disabled"
      @click="openPicker"
      @keydown.enter.prevent="openPicker"
      @keydown.space.prevent="openPicker"
      @dragenter.prevent="dragDepth++"
      @dragover.prevent
      @dragleave.prevent="dragDepth = Math.max(0, dragDepth - 1)"
      @drop.prevent="onDrop"
    >
      <CloudUpload class="h-8 w-8 text-text-muted" />
      <p class="text-sm text-text-primary">
        {{ dropLabel }}
        <span class="text-primary underline">{{ browseText }}</span>
      </p>
      <p v-if="hintText" class="text-xs text-text-secondary">{{ hintText }}</p>
      <input
        ref="inputRef"
        type="file"
        class="sr-only"
        :accept="accept || undefined"
        :multiple="multiple"
        :disabled="disabled"
        @click.stop
        @change="onInputChange"
      />
    </div>

    <ul v-if="errors.length" class="mt-2 space-y-1" role="alert">
      <li v-for="message in errors" :key="message" class="text-xs text-danger">{{ message }}</li>
    </ul>

    <ul v-if="files.length" class="mt-3 space-y-2">
      <li
        v-for="(file, index) in files"
        :key="`${file.name}-${file.size}-${file.lastModified}`"
        class="flex items-center gap-3 rounded-[8px] border border-border bg-surface-card px-3 py-2"
      >
        <FileText class="h-4 w-4 shrink-0 text-text-secondary" />
        <div class="min-w-0 flex-1 text-start">
          <p class="truncate text-sm text-text-primary">{{ file.name }}</p>
          <p class="text-xs text-text-secondary">{{ formatSize(file.size) }}</p>
          <slot name="progress" :file="file" :index="index" :progress="progressFor(file)">
            <div
              v-if="progressFor(file) !== undefined"
              class="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-input"
              role="progressbar"
              :aria-valuenow="progressFor(file)"
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <div
                class="h-full rounded-full bg-primary transition-[width] duration-200"
                :style="{ width: `${progressFor(file)}%` }"
              />
            </div>
          </slot>
        </div>
        <button
          type="button"
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded text-text-secondary transition-colors hover:bg-surface hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
          :aria-label="`${removeText}: ${file.name}`"
          :disabled="disabled"
          @click="removeFile(index)"
        >
          <Trash2 class="h-4 w-4" />
        </button>
      </li>
    </ul>
  </div>
</template>
