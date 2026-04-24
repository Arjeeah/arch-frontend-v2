<script setup lang="ts">
import { SquarePen, Ban } from 'lucide-vue-next'
import type { Faculties } from '../types'

defineProps<{
  items: Faculties[]
  loading?: boolean
}>()

const emit = defineEmits<{
  edit: [item: Faculties]
  delete: [item: Faculties]
}>()
</script>

<template>
  <div class="flex flex-col gap-3 overflow-x-auto">
    <!-- Header row -->
    <div
      class="flex flex-row items-center bg-surface-table border border-border rounded-[4px] h-[48px] min-w-[800px]"
    >
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-150 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Code</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-150 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Name (AR)</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-150 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Name (EN)</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-150 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Programs</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-150 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Files</span>
      </div>
      <div class="flex justify-center items-center px-[13px] w-[150px] shrink-0 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Status</span>
      </div>
      <div class="flex justify-center items-center px-[13px] w-[90px] shrink-0 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Actions</span>
      </div>
    </div>

    <!-- Loading skeleton -->
    <template v-if="loading">
      <div
        v-for="i in 6"
        :key="i"
        class="flex flex-row items-center bg-white border border-border rounded-[4px] h-[48px]"
      >
        <div class="flex justify-center items-center px-[13px] flex-1 min-w-0 h-full">
          <div class="h-4 bg-surface rounded animate-pulse w-[80px]" />
        </div>
        <div class="flex justify-center items-center px-[13px] flex-1 min-w-0 h-full">
          <div class="h-4 bg-surface rounded animate-pulse w-[80px]" />
        </div>
        <div class="flex justify-center items-center px-[13px] flex-1 min-w-0 h-full">
          <div class="h-4 bg-surface rounded animate-pulse w-[80px]" />
        </div>
        <div class="flex justify-center items-center px-[13px] flex-1 min-w-0 h-full">
          <div class="h-4 bg-surface rounded animate-pulse w-[80px]" />
        </div>
        <div class="flex justify-center items-center px-[13px] flex-1 min-w-0 h-full">
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
        <div class="flex items-center justify-center px-[13px] flex-1 min-w-0 overflow-hidden">
          <span class="text-[15px] font-sans text-text-secondary truncate">{{ item.code }}</span>
        </div>
        <!-- Name A R -->
        <div class="flex items-center justify-center px-[13px] flex-1 min-w-0 overflow-hidden">
          <span class="text-[15px] font-sans text-text-secondary truncate">{{ item.nameAR }}</span>
        </div>
        <!-- Name E N -->
        <div class="flex items-center justify-center px-[13px] flex-1 min-w-0 overflow-hidden">
          <span class="text-[15px] font-sans text-text-secondary truncate">{{ item.nameEN }}</span>
        </div>
        <!-- Programs -->
        <div class="flex items-center justify-center px-[13px] flex-1 min-w-0 overflow-hidden">
          <span class="text-[15px] font-sans text-text-secondary truncate">{{
            item.programs
          }}</span>
        </div>
        <!-- Files -->
        <div class="flex items-center justify-center px-[13px] flex-1 min-w-0 overflow-hidden">
          <span class="text-[15px] font-sans text-text-secondary truncate">{{ item.files }}</span>
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
            {{ item.status }}
          </span>
        </div>

        <!-- Actions -->
        <div class="flex justify-center items-center px-[13px] gap-[15px] w-[90px] shrink-0">
          <button
            class="text-[#4285F4] hover:opacity-70 transition-opacity"
            title="Edit"
            @click="emit('edit', item)"
          >
            <SquarePen class="w-6 h-6" />
          </button>
          <button
            class="text-danger hover:opacity-70 transition-opacity"
            title="Delete"
            @click="emit('delete', item)"
          >
            <Ban class="w-6 h-6" />
          </button>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-if="!items.length"
        class="flex justify-center items-center bg-white border border-border rounded-[4px] py-12"
      >
        <span class="text-sm text-text-muted font-sans">No records found.</span>
      </div>
    </template>
  </div>
</template>
