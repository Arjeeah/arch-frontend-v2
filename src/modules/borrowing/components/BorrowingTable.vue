<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { SquarePen, Ban } from 'lucide-vue-next'
import AppButton from '@/shared/components/AppButton.vue'
import { formatDate } from '@/shared/utils/date'
import BorrowingStatusBadge from './BorrowingStatusBadge.vue'
import { canApprove, canCancelOwn, canEditOwn, canMarkBorrowed, canReturn } from '../types'
import type { Borrowing } from '../types'

const props = defineProps<{
  items: Borrowing[]
  loading?: boolean
  /** archivist + super_admin — gates approve/reject/mark-borrowed/return. */
  canManageWorkflow: boolean
  /** super_admin — `BorrowingPolicy::delete` lets them delete any request. */
  canDeleteAny: boolean
  currentUserId: string | null
}>()

const emit = defineEmits<{
  edit: [item: Borrowing]
  delete: [item: Borrowing]
  approve: [item: Borrowing]
  reject: [item: Borrowing]
  markBorrowed: [item: Borrowing]
  markReturned: [item: Borrowing]
}>()

const { t } = useI18n()

function isOwner(item: Borrowing): boolean {
  return !!props.currentUserId && item.borrower?.id === props.currentUserId
}
function showEdit(item: Borrowing): boolean {
  return isOwner(item) && canEditOwn(item.status)
}
function showDelete(item: Borrowing): boolean {
  return props.canDeleteAny || (isOwner(item) && canCancelOwn(item.status))
}
</script>

<template>
  <div class="flex flex-col gap-3 overflow-x-auto">
    <!-- Header row -->
    <div
      class="flex flex-row items-center bg-surface-table border border-border rounded-[4px] h-[48px] min-w-[1200px]"
    >
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-[110px] h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">{{
          t('borrowing.table.document')
        }}</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-[110px] h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">{{
          t('borrowing.table.borrower')
        }}</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-[110px] h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">{{
          t('borrowing.table.notes')
        }}</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-[110px] h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">{{
          t('borrowing.table.dueDate')
        }}</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-[110px] h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">{{
          t('borrowing.table.borrowedAt')
        }}</span>
      </div>
      <div class="flex justify-center items-center px-[13px] flex-1 min-w-[110px] h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">{{
          t('borrowing.table.returnedAt')
        }}</span>
      </div>
      <div class="flex justify-center items-center px-[13px] w-[120px] shrink-0 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">{{
          t('borrowing.table.status')
        }}</span>
      </div>
      <div class="flex justify-center items-center px-[13px] w-[300px] shrink-0 h-full">
        <span class="text-[15px] font-sans font-bold text-text-secondary">{{
          t('borrowing.table.actions')
        }}</span>
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
        <!-- Notes -->
        <div
          class="flex flex-col items-center justify-center px-[13px] flex-1 min-w-[110px] overflow-hidden py-1"
        >
          <span class="text-[15px] font-sans text-text-secondary truncate w-full text-center">{{
            item.notes || '-'
          }}</span>
          <span
            v-if="item.status === 'rejected' && item.rejectionReason"
            class="text-xs font-sans text-danger truncate w-full text-center"
            :title="item.rejectionReason"
          >
            {{ t('borrowing.table.rejectionReasonPrefix') }} {{ item.rejectionReason }}
          </span>
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
          <template v-if="canManageWorkflow">
            <AppButton
              v-if="canApprove(item.status)"
              size="sm"
              variant="primary"
              @click="emit('approve', item)"
            >
              {{ t('borrowing.actions.approve') }}
            </AppButton>
            <AppButton
              v-if="canApprove(item.status)"
              size="sm"
              variant="danger"
              @click="emit('reject', item)"
            >
              {{ t('borrowing.actions.reject') }}
            </AppButton>
            <AppButton
              v-if="canMarkBorrowed(item.status)"
              size="sm"
              variant="accent"
              @click="emit('markBorrowed', item)"
            >
              {{ t('borrowing.actions.markBorrowed') }}
            </AppButton>
            <AppButton
              v-if="canReturn(item.status)"
              size="sm"
              variant="primary"
              @click="emit('markReturned', item)"
            >
              {{ t('borrowing.actions.markReturned') }}
            </AppButton>
          </template>

          <button
            v-if="showEdit(item)"
            class="text-[#4285F4] hover:opacity-70 transition-opacity shrink-0"
            :title="t('borrowing.actions.edit')"
            @click="emit('edit', item)"
          >
            <SquarePen class="w-5 h-5" />
          </button>
          <button
            v-if="showDelete(item)"
            class="text-danger hover:opacity-70 transition-opacity shrink-0"
            :title="t('borrowing.actions.delete')"
            @click="emit('delete', item)"
          >
            <Ban class="w-5 h-5" />
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
