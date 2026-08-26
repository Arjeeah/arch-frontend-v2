<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileSpreadsheet } from 'lucide-vue-next'
import AppButton from '@/shared/components/AppButton.vue'
import { TEMPLATE_COLUMNS } from '../types'
import type { ImportEntity } from '../types'

const props = defineProps<{
  entity: ImportEntity
  downloading: boolean
}>()

const emit = defineEmits<{ download: [] }>()

const { t } = useI18n()

const columns = computed(() => TEMPLATE_COLUMNS[props.entity])
</script>

<template>
  <section
    class="flex h-full flex-col gap-4 rounded-[10px] border border-border bg-surface-card p-5 shadow-sm"
  >
    <div class="flex flex-col gap-1">
      <h2 class="font-display text-base font-semibold text-text-primary">
        {{ t('imports.template.title') }}
      </h2>
      <p class="text-sm text-text-secondary font-sans">{{ t('imports.template.description') }}</p>
    </div>

    <div class="flex flex-col gap-2">
      <p class="font-display text-xs font-semibold text-text-secondary">
        {{ t('imports.template.columns') }}
      </p>
      <ul class="flex flex-wrap gap-2">
        <li
          v-for="column in columns"
          :key="column.name"
          class="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 font-sans text-xs text-text-primary"
        >
          <code>{{ column.name }}</code>
          <span v-if="!column.required" class="text-text-muted">
            {{ t('imports.template.optional') }}
          </span>
        </li>
      </ul>
    </div>

    <div class="mt-auto flex justify-start">
      <AppButton variant="accent" :loading="downloading" @click="emit('download')">
        <FileSpreadsheet class="h-4 w-4" />
        {{ t('imports.template.download') }}
      </AppButton>
    </div>
  </section>
</template>
