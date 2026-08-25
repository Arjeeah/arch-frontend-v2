<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { AlertCircle, BookOpen, File, RefreshCw, Users } from 'lucide-vue-next'
import AppButton from '@/shared/components/AppButton.vue'
import AppStatCard from '@/shared/components/AppStatCard.vue'
import { useToasts } from '@/shared/composables/useToasts'
import DashboardCard from '../components/DashboardCard.vue'
import FacultyStorageChart from '../components/FacultyStorageChart.vue'
import RecentActivityTable from '../components/RecentActivityTable.vue'
import StorageUsageCard from '../components/StorageUsageCard.vue'
import SystemHealthCard from '../components/SystemHealthCard.vue'
import UsersByRoleCard from '../components/UsersByRoleCard.vue'
import WeeklyDigestCard from '../components/WeeklyDigestCard.vue'
import { useAsyncResource } from '../composables/useAsyncResource'
import { dashboardApi } from '../api/dashboardApi'
import { formatNumber, formatPercent } from '../utils/format'
import { USER_ROLE_SLUGS, type DigestItem, type HealthItem } from '../types'

/**
 * Super-admin dashboard.
 *
 * Five independent requests rather than one: the numbers live in different
 * places (`/v1/dashboard`, the audit counters, the user list, the reports
 * module's digest) and each panel keeps its own loading / error / retry state,
 * so a single failing endpoint costs one card instead of the page.
 */
const { t, locale } = useI18n()
const toasts = useToasts()

const overview = useAsyncResource(() => dashboardApi.getAdminOverview())
const auditStats = useAsyncResource(() => dashboardApi.getAuditStats())
const activity = useAsyncResource(() => dashboardApi.getRecentActivity(8))
const roleCounts = useAsyncResource(() => dashboardApi.getUserRoleCounts(USER_ROLE_SLUGS))
const digest = useAsyncResource(() => dashboardApi.getWeeklyDigest())

const resources = [overview, auditStats, activity, roleCounts, digest]

/** Placeholder shown in a stat card while its number is still in flight. */
const PENDING = '—'

function statValue(value: number | null | undefined, loading: boolean): string {
  if (loading) return PENDING
  return typeof value === 'number' ? formatNumber(value, locale.value) : PENDING
}

const totalUsers = computed(() =>
  roleCounts.data.value ? roleCounts.data.value.reduce((sum, row) => sum + row.count, 0) : null,
)

const healthItems = computed<HealthItem[]>(() => {
  const items: HealthItem[] = []
  const storage = overview.data.value?.storage
  const warnings = overview.data.value?.warnings

  if (storage) {
    items.push({
      key: 'storage',
      label: t('dashboard.systemHealth.storage'),
      value: formatPercent(storage.percentage, locale.value),
      status: storage.percentage >= 90 ? 'danger' : storage.percentage >= 60 ? 'warning' : 'good',
    })
  }
  if (warnings) {
    items.push({
      key: 'warnings',
      label: t('dashboard.systemHealth.warnings'),
      value: formatNumber(warnings.length, locale.value),
      status: warnings.length > 0 ? 'warning' : 'good',
    })
  }
  const stats = auditStats.data.value
  if (stats) {
    items.push({
      key: 'documents',
      label: t('dashboard.systemHealth.documents'),
      value: formatNumber(stats.totalDocuments, locale.value),
      status: 'neutral',
    })
    items.push({
      key: 'operations',
      label: t('dashboard.systemHealth.operationsToday'),
      value: formatNumber(stats.totalOperationsToday, locale.value),
      status: 'neutral',
    })
  }
  return items
})

const digestItems = computed<DigestItem[]>(() => {
  const data = digest.data.value
  if (!data) return []
  return [
    {
      key: 'overdue',
      label: t('dashboard.weeklyDigest.overdue'),
      value: formatNumber(data.overdueFilesCount, locale.value),
      tone: data.overdueFilesCount > 0 ? 'danger' : 'success',
    },
    {
      key: 'dueSoon',
      label: t('dashboard.weeklyDigest.dueSoon'),
      value: formatNumber(data.dueInSevenDaysCount, locale.value),
      tone: data.dueInSevenDaysCount > 0 ? 'warning' : 'success',
    },
    {
      key: 'weeklyBorrowing',
      label: t('dashboard.weeklyDigest.weeklyBorrowing'),
      value: formatNumber(data.weeklyBorrowingCount, locale.value),
      tone: 'primary',
    },
    {
      key: 'storage',
      label: t('dashboard.weeklyDigest.storage'),
      value: formatPercent(data.storageUsagePercent, locale.value),
      tone: 'warning',
    },
  ]
})

/** The health card draws on two endpoints, so it only fails when both do. */
const healthError = computed(() =>
  overview.error.value && auditStats.error.value ? overview.error.value : null,
)
const healthLoading = computed(() => overview.loading.value && auditStats.loading.value)

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

function retryHealth(): void {
  void overview.load()
  void auditStats.load()
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between gap-4">
      <h1 class="text-2xl font-display font-semibold text-text-primary">
        {{ t('dashboard.title') }}
      </h1>
      <AppButton variant="ghost" size="sm" :loading="refreshing" @click="refreshAll">
        <RefreshCw v-if="!refreshing" class="w-4 h-4" />
        {{ t('dashboard.refresh') }}
      </AppButton>
    </div>

    <!-- Stat cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <AppStatCard
        :label="t('dashboard.stats.totalArchive')"
        :value="statValue(overview.data.value?.totalArchive, overview.loading.value)"
        :sub-label="t('dashboard.stats.totalArchiveHint')"
        :icon="File"
      />
      <AppStatCard
        :label="t('dashboard.stats.totalUsers')"
        :value="statValue(totalUsers, roleCounts.loading.value)"
        :sub-label="t('dashboard.stats.totalUsersHint')"
        :icon="Users"
      />
      <AppStatCard
        :label="t('dashboard.stats.activeBorrows')"
        :value="statValue(overview.data.value?.activeBorrows, overview.loading.value)"
        :sub-label="t('dashboard.stats.activeBorrowsHint')"
        :icon="BookOpen"
      />
      <AppStatCard
        :label="t('dashboard.stats.securityAlerts')"
        :value="statValue(auditStats.data.value?.securityAlertsCount, auditStats.loading.value)"
        :sub-label="t('dashboard.stats.securityAlertsHint')"
        :icon="AlertCircle"
      />
    </div>

    <!-- Storage: per-faculty split beside the overall gauge -->
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

    <!-- Info cards row -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <SystemHealthCard
        :items="healthItems"
        :loading="healthLoading"
        :error="healthError"
        @retry="retryHealth"
      />
      <UsersByRoleCard
        :rows="roleCounts.data.value ?? []"
        :loading="roleCounts.loading.value"
        :error="roleCounts.error.value"
        @retry="roleCounts.load()"
      />
      <WeeklyDigestCard
        :items="digestItems"
        :loading="digest.loading.value"
        :error="digest.error.value"
        @retry="digest.load()"
      />
    </div>

    <RecentActivityTable
      :rows="activity.data.value ?? []"
      :loading="activity.loading.value"
      :error="activity.error.value"
      @retry="activity.load()"
    />
  </div>
</template>
