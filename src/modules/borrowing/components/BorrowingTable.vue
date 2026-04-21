<script setup lang="ts">
import { SquarePen, Ban } from 'lucide-vue-next'
import type { Borrowing } from '../types'

defineProps<{
  items: Borrowing[]
  loading?: boolean
}>()

const emit = defineEmits<{
  edit: [item: Borrowing]
  delete: [item: Borrowing]
}>()
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Header row -->
    <div
      class="flex flex-row items-center bg-surface-table border border-border rounded-[4px] h-[48px]"
    >
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-0 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">File Number</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-0 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Borrower Name</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-0 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Faculty</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-0 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Purpose</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-0 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Borrow Date</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-0 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Due Date</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-0 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Return Date</span>
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
        class="flex flex-row items-center bg-white border border-border rounded-[4px] h-[48px]"
      >
        <!-- File Number -->
        <div class="flex items-center justify-center px-[13px] flex-1 min-w-0 overflow-hidden">
          <span class="text-[15px] font-sans text-text-secondary truncate">{{
            item.fileNumber
          }}</span>
        </div>
        <!-- Borrower Name -->
        <div class="flex items-center justify-center px-[13px] flex-1 min-w-0 overflow-hidden">
          <span class="text-[15px] font-sans text-text-secondary truncate">{{
            item.borrowerName
          }}</span>
        </div>
        <!-- Faculty -->
        <div class="flex items-center justify-center px-[13px] flex-1 min-w-0 overflow-hidden">
          <span class="text-[15px] font-sans text-text-secondary truncate">{{ item.faculty }}</span>
        </div>
        <!-- Purpose -->
        <div class="flex items-center justify-center px-[13px] flex-1 min-w-0 overflow-hidden">
          <span class="text-[15px] font-sans text-text-secondary truncate">{{ item.purpose }}</span>
        </div>
        <!-- Borrow Date -->
        <div class="flex items-center justify-center px-[13px] flex-1 min-w-0 overflow-hidden">
          <span class="text-[15px] font-sans text-text-secondary truncate">{{
            item.borrowDate
          }}</span>
        </div>
        <!-- Due Date -->
        <div class="flex items-center justify-center px-[13px] flex-1 min-w-0 overflow-hidden">
          <span class="text-[15px] font-sans text-text-secondary truncate">{{ item.dueDate }}</span>
        </div>
        <!-- Return Date -->
        <div class="flex items-center justify-center px-[13px] flex-1 min-w-0 overflow-hidden">
          <span class="text-[15px] font-sans text-text-secondary truncate">{{
            item.returnDate
          }}</span>
        </div>
        <!-- Status -->
        <div class="flex justify-center items-center px-[13px] w-[150px] shrink-0">
          <span
            class="px-3 py-1 rounded-full text-xs font-medium"
            :class="
              item.status === 'borrowed'
                ? 'bg-[#E8F5E9] text-[#2E7D32]'
                : 'bg-surface text-text-secondary'
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
