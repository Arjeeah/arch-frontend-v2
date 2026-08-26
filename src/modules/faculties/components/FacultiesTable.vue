<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { SquarePen, Ban } from 'lucide-vue-next'
import type { Faculty } from '../types'

defineProps<{
  items: Faculty[]
  loading?: boolean
}>()

const emit = defineEmits<{
  edit: [item: Faculty]
  delete: [item: Faculty]
}>()

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col gap-3 overflow-x-auto">
    <!-- Header row -->
    <div
      class="flex flex-row items-center bg-surface-table border border-border rounded-[4px] h-[48px] min-w-[800px]"
    >
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-[100px] h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">{{
          t('faculties.table.code')
        }}</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-[100px] h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">{{
          t('faculties.table.nameAr')
        }}</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-[100px] h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">{{
          t('faculties.table.nameEn')
        }}</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-[100px] h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">{{
          t('faculties.table.programs')
        }}</span>
      </div>
      <div class="flex justify-center items-center px-[13px] w-[150px] shrink-0 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">{{
          t('faculties.table.status')
        }}</span>
      </div>
      <div class="flex justify-center items-center px-[13px] w-[90px] shrink-0 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">{{
          t('faculties.table.actions')
        }}</span>
      </div>
    </div>

    <!-- Loading skeleton -->
    <template v-if="loading">
      <div
        v-for="i in 6"
        :key="i"
        class="flex flex-row items-center bg-white border border-border rounded-[4px] h-[48px] min-w-[800px]"
      >
        <div
          v-for="j in 4"
          :key="j"
          class="flex justify-center items-center px-[13px] flex-1 min-w-[100px] h-full"
        >
          <div class="h-4 bg-surface rounded animate-pulse w-[80px]" />
        </div>
        <div class="flex justify-center items-center px-[13px] w-[150px] shrink-0 h-full">
          <div class="h-4 bg-surface rounded animate-pulse w-[60px]" />
        </div>
        <div class="flex justify-center items-center px-[13px] w-[90px] shrink-0 h-full">
          <div class="h-4 bg-surface rounded animate-pulse w-[60px]" />
        </div>
      </div>
    </template>

    <!-- Data rows -->
    <template v-else>
      <div
        v-for="item in items"
        :key="item.id"
        class="flex flex-row items-center bg-white border border-border rounded-[4px] h-[48px] min-w-[800px]"
      >
        <!-- Code -->
        <div
          class="flex items-center justify-center px-[13px] flex-1 min-w-[100px] overflow-hidden"
        >
          <span class="text-[15px] font-sans text-text-secondary truncate">{{ item.code }}</span>
        </div>
        <!-- Name A R -->
        <div
          class="flex items-center justify-center px-[13px] flex-1 min-w-[100px] overflow-hidden"
        >
          <span class="text-[15px] font-sans text-text-secondary truncate">{{ item.nameAR }}</span>
        </div>
        <!-- Name E N -->
        <div
          class="flex items-center justify-center px-[13px] flex-1 min-w-[100px] overflow-hidden"
        >
          <span class="text-[15px] font-sans text-text-secondary truncate">{{ item.nameEN }}</span>
        </div>
        <!-- Programs -->
        <div
          class="flex items-center justify-center px-[13px] flex-1 min-w-[100px] overflow-hidden"
        >
          <span class="text-[15px] font-sans text-text-secondary truncate">{{
            item.programsCount
          }}</span>
        </div>
        <!-- Status -->
        <div class="flex justify-center items-center px-[13px] w-[150px] shrink-0">
          <span
            class="px-3 py-1 rounded-full text-xs font-display font-medium"
            :class="
              item.status === 'Active'
                ? 'bg-success-bg text-success-text'
                : 'bg-inactive-bg text-inactive-text'
            "
          >
            {{
              item.status === 'Active'
                ? t('faculties.status.active')
                : t('faculties.status.inactive')
            }}
          </span>
        </div>

        <!-- Actions -->
        <div class="flex justify-center items-center px-[13px] gap-[15px] w-[90px] shrink-0">
          <button
            class="text-[#4285F4] hover:opacity-70 transition-opacity"
            :title="t('faculties.table.editAction')"
            @click="emit('edit', item)"
          >
            <SquarePen class="w-6 h-6" />
          </button>
          <button
            class="text-danger hover:opacity-70 transition-opacity"
            :title="t('faculties.table.deleteAction')"
            @click="emit('delete', item)"
          >
            <Ban class="w-6 h-6" />
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
