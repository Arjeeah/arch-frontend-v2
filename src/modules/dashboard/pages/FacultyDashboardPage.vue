<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { BookOpen, Clock, File, Inbox, RefreshCw } from 'lucide-vue-next'
import AppButton from '@/shared/components/AppButton.vue'
import AppErrorState from '@/shared/components/AppErrorState.vue'
import AppStatCard from '@/shared/components/AppStatCard.vue'
import { useToasts } from '@/shared/composables/useToasts'
import FacultyBorrowTable from '../components/FacultyBorrowTable.vue'
import { useAsyncResource } from '../composables/useAsyncResource'
import { dashboardApi } from '../api/dashboardApi'
import { formatNumber } from '../utils/format'

/**
 * Faculty-staff dashboard: their faculties' files, their own borrowings, and
 * what is pending or late.
 *
 * Everything comes from one endpoint, so the failure state is page-level rather
 * than per-card.
 *
 * This page used to special-case a 500 as "the service failed on a pending
 * borrowing request" — a real server bug at the time, since fixed (see
 * `dashboardApi.getFacultyOverview`) and confirmed fixed against the live API.
 * Naming a repaired bug as the cause of *any* 500 misdiagnoses the next
 * unrelated one, so the generic error message stands on its own again.
 */
const { t, locale } = useI18n()
const toasts = useToasts()

const faculty = useAsyncResource(() => dashboardApi.getFacultyOverview(), {
  errorFallback: t('dashboard.loadFailed'),
})

const PENDING = '—'

function statValue(value: number | undefined): string {
  if (faculty.loading.value) return PENDING
  return typeof value === 'number' ? formatNumber(value, locale.value) : PENDING
}

const summary = computed(() => faculty.data.value?.summary)

async function refresh(): Promise<void> {
  await faculty.load()
  if (faculty.error.value) {
    toasts.error(t('dashboard.refreshFailed'))
  } else {
    toasts.success(t('dashboard.refreshed'))
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between gap-4">
      <h1 class="text-2xl font-display font-semibold text-text-primary">
        {{ t('dashboard.facultyTitle') }}
      </h1>
      <AppButton variant="ghost" size="sm" :loading="faculty.loading.value" @click="refresh">
        <RefreshCw v-if="!faculty.loading.value" class="w-4 h-4" />
        {{ t('dashboard.refresh') }}
      </AppButton>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <AppStatCard
        :label="t('dashboard.stats.facultyFiles')"
        :value="statValue(summary?.totalFacultyFiles)"
        :sub-label="t('dashboard.stats.facultyFilesHint')"
        :icon="File"
      />
      <AppStatCard
        :label="t('dashboard.stats.myBorrowings')"
        :value="statValue(summary?.activeBorrowingsByUser)"
        :sub-label="t('dashboard.stats.myBorrowingsHint')"
        :icon="BookOpen"
      />
      <AppStatCard
        :label="t('dashboard.stats.pendingRequests')"
        :value="statValue(summary?.activeRequestsCount)"
        :sub-label="t('dashboard.stats.pendingRequestsHint')"
        :icon="Inbox"
      />
      <AppStatCard
        :label="t('dashboard.stats.overdue')"
        :value="statValue(summary?.overdueFilesCount)"
        :sub-label="t('dashboard.stats.overdueHint')"
        :icon="Clock"
      />
    </div>

    <div v-if="faculty.error.value" class="bg-white rounded-[10px] border border-border shadow-sm">
      <AppErrorState
        :title="faculty.error.value"
        :retry-label="t('dashboard.retry')"
        @retry="faculty.load()"
      />
    </div>

    <template v-else>
      <FacultyBorrowTable
        variant="requests"
        :rows="faculty.data.value?.recentRequests ?? []"
        :loading="faculty.loading.value"
      />
      <FacultyBorrowTable
        variant="overdue"
        :rows="faculty.data.value?.overdueFiles ?? []"
        :loading="faculty.loading.value"
      />
      <FacultyBorrowTable
        variant="borrowings"
        :rows="faculty.data.value?.recentBorrowings ?? []"
        :loading="faculty.loading.value"
      />
    </template>
  </div>
</template>
