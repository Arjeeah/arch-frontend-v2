<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Upload } from 'lucide-vue-next'
import AppButton from '@/shared/components/AppButton.vue'
import AppFileUpload from '@/shared/components/AppFileUpload.vue'
import { IMPORT_ACCEPT, IMPORT_MAX_SIZE_MB } from '../types'

const props = defineProps<{
  files: File[]
  uploading: boolean
  /** 0–100 keyed by file name, straight from the store. */
  progress: Record<string, number>
}>()

const emit = defineEmits<{
  'update:files': [files: File[]]
  upload: [file: File]
  /** Rejected files, so the page can toast the reason. */
  reject: [messages: string[]]
}>()

const { t } = useI18n()

/**
 * Client-side mirror of `ImportController::store`'s validator:
 * `file|mimes:xlsx,csv|max:10240` (KB), one file per job.
 */
const accept = IMPORT_ACCEPT
const maxSizeMb = IMPORT_MAX_SIZE_MB

const selected = computed(() => props.files[0] ?? null)

function submit(): void {
  if (selected.value) emit('upload', selected.value)
}
</script>

<template>
  <section
    class="flex h-full flex-col gap-4 rounded-[10px] border border-border bg-surface-card p-5 shadow-sm"
  >
    <div class="flex flex-col gap-1">
      <h2 class="font-display text-base font-semibold text-text-primary">
        {{ t('imports.upload.title') }}
      </h2>
      <p class="text-sm text-text-secondary font-sans">{{ t('imports.upload.description') }}</p>
    </div>

    <AppFileUpload
      :files="files"
      :accept="accept"
      :max-size-mb="maxSizeMb"
      :max-files="1"
      :multiple="false"
      :disabled="uploading"
      :progress="progress"
      :label="t('imports.upload.dropLabel')"
      :browse-label="t('imports.upload.browse')"
      :hint="t('imports.upload.hint', { size: maxSizeMb })"
      :remove-label="t('imports.upload.remove')"
      @update:files="emit('update:files', $event)"
      @error="emit('reject', $event)"
    />

    <div class="mt-auto flex justify-start">
      <AppButton :loading="uploading" :disabled="!selected" @click="submit">
        <Upload class="h-4 w-4" />
        {{ t('imports.upload.submit') }}
      </AppButton>
    </div>
  </section>
</template>
