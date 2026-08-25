<script setup lang="ts">
import { SquarePen, Ban } from 'lucide-vue-next'
import AppButton from '@/shared/components/AppButton.vue'
import { formatDate } from '@/shared/utils/date'
import BorrowingStatusBadge from './BorrowingStatusBadge.vue'
import { canApprove, canMarkBorrowed, canReturn } from '../types'
import type { Borrowing } from '../types'

defineProps<{
  items: Borrowing[]
  loading?: boolean
}>()

const emit = defineEmits<{
  edit: [item: Borrowing]
  delete: [item: Borrowing]
  approve: [item: Borrowing]
  reject: [item: Borrowing]
  markBorrowed: [item: Borrowing]
  markReturned: [item: Borrowing]
}>()
</script>

<template>
  <div class="flex flex-col gap-3 overflow-x-auto">
    <!-- Header row -->
    <div
      class="flex flex-row items-center bg-surface-table border border-border rounded-[4px] h-[48px] min-w-[1200px]"
    >
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-[110px] h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Document</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-[110px] h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Borrower</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-[110px] h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Purpose</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-[110px] h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Due Date</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-[110px] h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Borrowed At</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-[110px] h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Returned At</span>
      </div>
      <div class="flex justify-center items-center px-[13px] w-[120px] shrink-0 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Status</span>
      </div>
      <div class="flex justify-center items-center px-[13px] w-[300px] shrink-0 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">Actions</span>
      </div>
    </div>

    <!-- Loading skeleton -->
    <template v-if="loading">
      <div
        v-for="i in 6"
        :key="i"
        class="flex flex-row items-center bg-white border border-border rounded-[4px] h-[56px] min-w-[1200px]"
      >
        <div
          v-for="j in 6"
          :key="j"
          class="flex justify-center items-center px-[13px] flex-1 min-w-[110px] h-full"
        >
          <div class="h-4 bg-surface rounded animate-pulse w-[80px]" />
        </div>
        <div class="flex justify-center items-center px-[13px] w-[120px] shrink-0 h-full">
          <div class="h-4 bg-surface rounded animate-pulse w-[60px]" />
        </div>
        <div class="flex justify-center items-center px-[13px] w-[300px] shrink-0 h-full">
          <div class="h-4 bg-surface rounded animate-pulse w-[140px]" />
        </div>
      </div>
    </template>

    <!-- Data rows -->
    <template v-else>
      <div
        v-for="item in items"
        :key="item.id"
        class="flex flex-row items-center bg-white border border-border rounded-[4px] h-[56px] min-w-[1200px]"
      >
        <!-- Document -->
        <div
          class="flex items-center justify-center px-[13px] flex-1 min-w-[110px] overflow-hidden"
        >
          <span class="text-[15px] font-sans text-text-secondary truncate">{{
            item.document?.title ?? '-'
          }}</span>
        </div>
        <!-- Borrower -->
        <div
          class="flex items-center justify-center px-[13px] flex-1 min-w-[110px] overflow-hidden"
        >
          <span class="text-[15px] font-sans text-text-secondary truncate">{{
            item.borrower?.name ?? '-'
          }}</span>
        </div>
        <!-- Purpose -->
        <div
          class="flex items-center justify-center px-[13px] flex-1 min-w-[110px] overflow-hidden"
        >
          <span class="text-[15px] font-sans text-text-secondary truncate">{{
            item.purpose || '-'
          }}</span>
        </div>
        <!-- Due Date -->
        <div
          class="flex items-center justify-center px-[13px] flex-1 min-w-[110px] overflow-hidden"
        >
          <span class="text-[15px] font-sans text-text-secondary truncate">{{
            formatDate(item.dueDate)
          }}</span>
        </div>
        <!-- Borrowed At -->
        <div
          class="flex items-center justify-center px-[13px] flex-1 min-w-[110px] overflow-hidden"
        >
          <span class="text-[15px] font-sans text-text-secondary truncate">{{
            formatDate(item.borrowedAt)
          }}</span>
        </div>
        <!-- Returned At -->
        <div
          class="flex items-center justify-center px-[13px] flex-1 min-w-[110px] overflow-hidden"
        >
          <span class="text-[15px] font-sans text-text-secondary truncate">{{
            formatDate(item.returnedAt)
          }}</span>
        </div>
        <!-- Status -->
        <div class="flex justify-center items-center px-[13px] w-[120px] shrink-0">
          <BorrowingStatusBadge :status="item.status" />
        </div>

        <!-- Actions -->
        <div class="flex justify-end items-center px-[13px] gap-2 w-[300px] shrink-0">
          <AppButton
            v-if="canApprove(item.status)"
            size="sm"
            variant="primary"
            @click="emit('approve', item)"
          >
            Approve
          </AppButton>
          <AppButton
            v-if="canApprove(item.status)"
            size="sm"
            variant="danger"
            @click="emit('reject', item)"
          >
            Reject
          </AppButton>
          <AppButton
            v-if="canMarkBorrowed(item.status)"
            size="sm"
            variant="accent"
            @click="emit('markBorrowed', item)"
          >
            Mark Borrowed
          </AppButton>
          <AppButton
            v-if="canReturn(item.status)"
            size="sm"
            variant="primary"
            @click="emit('markReturned', item)"
          >
            Return
          </AppButton>

          <button
            class="text-[#4285F4] hover:opacity-70 transition-opacity shrink-0"
            title="Edit"
            @click="emit('edit', item)"
          >
            <SquarePen class="w-5 h-5" />
          </button>
          <button
            class="text-danger hover:opacity-70 transition-opacity shrink-0"
            title="Delete"
            @click="emit('delete', item)"
          >
            <Ban class="w-5 h-5" />
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
