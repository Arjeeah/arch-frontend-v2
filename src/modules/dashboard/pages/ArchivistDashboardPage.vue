<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { BookOpen, Clock, File, RefreshCw, ScanLine } from 'lucide-vue-next'
import AppButton from '@/shared/components/AppButton.vue'
import AppStatCard from '@/shared/components/AppStatCard.vue'
import { useToasts } from '@/shared/composables/useToasts'
import CapacityWarningBanner from '../components/CapacityWarningBanner.vue'
import DashboardCard from '../components/DashboardCard.vue'
import FacultyStorageChart from '../components/FacultyStorageChart.vue'
import OcrQueueCard from '../components/OcrQueueCard.vue'
import RecentActivityTable from '../components/RecentActivityTable.vue'
import StorageUsageCard from '../components/StorageUsageCard.vue'
import { useAsyncResource } from '../composables/useAsyncResource'
import { dashboardApi } from '../api/dashboardApi'
import { formatChangePercent, formatNumber } from '../utils/format'

/**
 * Archivist dashboard — the day-to-day view of the physical archive.
 *
 * `/v1/dashboard/archivist` carries the KPIs, the drawer-capacity warning and
 * the activity feed; `/v1/dashboard` (which archivists may also call) adds the
 * storage picture. Two requests, two independent panels' worth of failure.
 */
const { t, locale } = useI18n()
const toasts = useToasts()

const archivist = useAsyncResource(() => dashboardApi.getArchivistOverview())
const overview = useAsyncResource(() => dashboardApi.getAdminOverview())

const resources = [archivist, overview]

const PENDING = '—'

function statValue(value: number | undefined, loading: boolean): string {
  if (loading) return PENDING
  return typeof value === 'number' ? formatNumber(value, locale.value) : PENDING
}

const summary = computed(() => archivist.data.value?.summary)

/** Day-over-day scan change, e.g. "+12.5% vs yesterday". */
const scansChangeLabel = computed(() => {
  const change = summary.value?.scansTodayChangePct
  if (typeof change !== 'number') return t('dashboard.stats.scansTodayHint')
  return t('dashboard.stats.scansTodayChange', {
    change: formatChangePercent(change, locale.value),
  })
})

const refreshing = computed(() => resources.some((resource) => resource.loading.value))

async function refreshAll(): Promise<void> {
  await Promise.all(resources.map((resource) => resource.load()))
  const failed = resources.filter((resource) => resource.error.value).length
  if (failed === resources.length) {
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
        {{ t('dashboard.archivistTitle') }}
      </h1>
      <AppButton variant="ghost" size="sm" :loading="refreshing" @click="refreshAll">
        <RefreshCw v-if="!refreshing" class="w-4 h-4" />
        {{ t('dashboard.refresh') }}
      </AppButton>
    </div>

    <CapacityWarningBanner
      v-if="archivist.data.value"
      :warning="archivist.data.value.capacityWarning"
    />

    <!-- KPI cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <AppStatCard
        :label="t('dashboard.stats.totalFiles')"
        :value="statValue(summary?.totalFiles, archivist.loading.value)"
        :sub-label="t('dashboard.stats.totalFilesHint')"
        :icon="File"
      />
      <AppStatCard
        :label="t('dashboard.stats.borrowedNow')"
        :value="statValue(summary?.borrowedNow, archivist.loading.value)"
        :sub-label="t('dashboard.stats.borrowedNowHint')"
        :icon="BookOpen"
      />
      <AppStatCard
        :label="t('dashboard.stats.overdue')"
        :value="statValue(summary?.overdue, archivist.loading.value)"
        :sub-label="t('dashboard.stats.overdueHint')"
        :icon="Clock"
      />
      <AppStatCard
        :label="t('dashboard.stats.scansToday')"
        :value="statValue(summary?.scansToday, archivist.loading.value)"
        :sub-label="scansChangeLabel"
        :icon="ScanLine"
      />
    </div>

    <!-- Storage -->
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <DashboardCard
        class="xl:col-span-2"
        :title="t('dashboard.facultyStorage.title')"
        :loading="overview.loading.value"
        :error="overview.error.value"
        :empty="!overview.data.value?.facultyStorage.length"
        :empty-title="t('dashboard.facultyStorage.empty')"
        :retry-label="t('dashboard.retry')"
        :skeleton-rows="5"
        @retry="overview.load()"
      >
        <FacultyStorageChart :rows="overview.data.value?.facultyStorage ?? []" />
      </DashboardCard>

      <DashboardCard
        :title="t('dashboard.storage.title')"
        :loading="overview.loading.value"
        :error="overview.error.value"
        :retry-label="t('dashboard.retry')"
        @retry="overview.load()"
      >
        <StorageUsageCard
          v-if="overview.data.value"
          :storage="overview.data.value.storage"
          :warnings="overview.data.value.warnings"
        />
      </DashboardCard>
    </div>

    <!-- Pipeline + activity -->
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
      <OcrQueueCard
        :queue="archivist.data.value?.ocrQueue ?? null"
        :loading="archivist.loading.value"
        :error="archivist.error.value"
        @retry="archivist.load()"
      />
      <div class="xl:col-span-2">
        <RecentActivityTable
          :rows="archivist.data.value?.recentActivity ?? []"
          :loading="archivist.loading.value"
          :error="archivist.error.value"
          @retry="archivist.load()"
        />
      </div>
    </div>
  </div>
</template>
