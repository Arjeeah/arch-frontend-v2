<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Activity, FileStack, HandCoins, ShieldAlert } from 'lucide-vue-next'
import { readSessionRole } from '@/app/config/sessionRole'
import AppErrorState from '@/shared/components/AppErrorState.vue'
import AppEmptyState from '@/shared/components/AppEmptyState.vue'
import AppPagination from '@/shared/components/AppPagination.vue'
import AppSelect from '@/shared/components/AppSelect.vue'
import AppStatCard from '@/shared/components/AppStatCard.vue'
import DataTable from '@/shared/components/DataTable.vue'
import ExportButton from '@/shared/components/ExportButton.vue'
import LiveBadge from '@/shared/components/LiveBadge.vue'
import SearchBar from '@/shared/components/SearchBar.vue'
import { useDebouncedRef } from '@/shared/composables/useDebouncedRef'
import { useServerTable } from '@/shared/composables/useServerTable'
import { useToasts } from '@/shared/composables/useToasts'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import { formatDateTime, relativeTime } from '@/shared/utils/date'
import { saveBlob } from '@/shared/utils/saveBlob'
import { auditApi, type AuditLogQuery } from '../api/auditApi'
import { useAuditStore } from '../stores/useAuditStore'
import { AUDIT_ACTIONS, AUDIT_ROLE_FILTERS, isAuditAction, type AuditLog } from '../types'

const { t, te } = useI18n()
const route = useRoute()
const auditStore = useAuditStore()
const toasts = useToasts()

/**
 * `AuditLogPolicy` splits this screen three ways: `viewAny` and `export` are
 * open to every authenticated role, `viewStats` is SA + archivist, and
 * `viewTimeline` is SA only — each confirmed against the live API, which
 * answers an archivist 200 / 200 / 200 / 403 across index, export, stats and
 * timeline. `IndexAuditLogRequest::prepareForValidation` also strips the
 * `role` filter for anyone below super_admin. Rendering a control the server
 * would refuse is what produced the 403 that used to take the stat cards down
 * with it.
 *
 * The route itself (`meta.roles`) admits only SA and archivist, so the stats
 * cards and the export button need no guard of their own — both roles that can
 * reach this page may call both endpoints.
 */
const sessionRole = readSessionRole()
const canSeeTimeline = computed(() => sessionRole === 'super_admin')
const canFilterByRole = computed(() => sessionRole === 'super_admin')
const canSeeSecurityAlerts = computed(() => sessionRole === 'super_admin')

/* ---------------------------------------------------------------- *
 * Filters
 * ---------------------------------------------------------------- */

/**
 * `/audit-logs?action=failed_login` is the backend's own deep link for the
 * security-alert notification; the router redirects it here keeping the query.
 */
function initialAction(): string {
  const raw = Array.isArray(route.query.action) ? route.query.action[0] : route.query.action
  return isAuditAction(raw) ? raw : ''
}

const referenceId = ref('')
const debouncedReferenceId = useDebouncedRef(referenceId)
const action = ref(initialAction())
const role = ref('')
const sort = ref('desc')

/**
 * Never send an empty string: Laravel's global `ConvertEmptyStringsToNull`
 * turns `''` into `null`, and `IndexAuditLogRequest`'s `sometimes|string`
 * rules reject `null`. Axios drops `undefined` values from the query instead.
 */
const activeFilters = computed<AuditLogQuery>(() => ({
  reference_id: debouncedReferenceId.value.trim() || undefined,
  action: action.value || undefined,
  role: canFilterByRole.value ? role.value || undefined : undefined,
  sort: sort.value === 'asc' ? 'asc' : 'desc',
}))

const table = useServerTable<AuditLog>((params) => auditApi.getLogs(params), {
  perPage: 25,
  filters: { ...activeFilters.value },
  errorFallback: t('audit.logs.error'),
})

watch(activeFilters, (filters) => table.setFilters({ ...filters }))

const roleOptions = computed(() => [
  { value: '', label: t('audit.filters.allRoles') },
  ...AUDIT_ROLE_FILTERS.map((value) => ({ value, label: t(`common.roles.${value}`) })),
])

const actionOptions = computed(() => [
  { value: '', label: t('audit.filters.allActions') },
  ...AUDIT_ACTIONS.map((value) => ({ value, label: t(`common.auditActions.${value}`) })),
])

const sortOptions = computed(() => [
  { value: 'desc', label: t('audit.sort.newest') },
  { value: 'asc', label: t('audit.sort.oldest') },
])

const hasActiveFilters = computed(
  () =>
    !!(activeFilters.value.reference_id || activeFilters.value.action || activeFilters.value.role),
)

/* ---------------------------------------------------------------- *
 * Labels
 * ---------------------------------------------------------------- */

/** `snake_case_action` → `Snake case action`, for a value we have no label for. */
function humanize(value: string): string {
  const spaced = value.replace(/_/g, ' ').trim()
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : '-'
}

/**
 * Our own translation first, so the Arabic UI stays Arabic; then the server's
 * `action_label`, then a humanised slug for an action the locale files have
 * not caught up with.
 */
function actionLabel(log: AuditLog): string {
  const key = `common.auditActions.${log.action}`
  if (te(key)) return t(key)
  return log.actionLabel ?? humanize(log.action)
}

/** `role` is a snapshot, so it can also be `system` or `unknown`. */
function roleLabel(value: string | null): string {
  if (!value) return '-'
  const key = `common.roles.${value}`
  return te(key) ? t(key) : humanize(value)
}

const columns = computed(() => [
  { key: 'timestamp', label: t('audit.columns.timestamp') },
  { key: 'user', label: t('audit.columns.user') },
  { key: 'role', label: t('audit.columns.role') },
  { key: 'action', label: t('audit.columns.action') },
  { key: 'targetEntity', label: t('audit.columns.targetEntity') },
  { key: 'referenceId', label: t('audit.columns.referenceId') },
])

/* ---------------------------------------------------------------- *
 * Lifecycle
 * ---------------------------------------------------------------- */

onMounted(() => {
  void auditStore.fetchStats()
  if (canSeeTimeline.value) void auditStore.fetchTimeline()
})

/* ---------------------------------------------------------------- *
 * Export
 * ---------------------------------------------------------------- */

const exporting = ref(false)

/**
 * Built here rather than parsed out of `Content-Disposition`: the header is not
 * exposed cross-origin, so the old regex fell back to a constant anyway. The
 * shape mirrors `AuditLogController::export`.
 */
function exportFileName(): string {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-')
  return `audit-logs-${stamp}.csv`
}

async function handleExport(): Promise<void> {
  if (exporting.value) return
  exporting.value = true
  try {
    const response = await auditApi.exportReport(activeFilters.value)
    saveBlob(new Blob([response.data]), exportFileName())
    toasts.success(t('audit.export.success'))
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('audit.export.error')))
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Page Header -->
    <div class="flex items-center justify-between shrink-0">
      <h1 class="text-2xl font-display font-semibold text-text-primary">{{ t('audit.title') }}</h1>
      <ExportButton :label="t('audit.export.label')" :loading="exporting" @click="handleExport" />
    </div>

    <!-- Stat Cards -->
    <AppErrorState
      v-if="auditStore.statsError"
      compact
      :title="t('audit.stats.error')"
      :description="auditStore.statsError"
      @retry="auditStore.fetchStats()"
    />
    <div
      v-else
      class="grid grid-cols-1 gap-6 shrink-0"
      :class="canSeeSecurityAlerts ? 'md:grid-cols-4' : 'md:grid-cols-3'"
    >
      <AppStatCard
        :label="t('audit.stats.operationsToday')"
        :value="auditStore.stats?.totalOperationsToday ?? '-'"
        :icon="Activity"
      />
      <AppStatCard
        :label="t('audit.stats.totalDocuments')"
        :value="auditStore.stats?.totalDocuments ?? '-'"
        :icon="FileStack"
      />
      <AppStatCard
        :label="t('audit.stats.borrowingsToday')"
        :value="auditStore.stats?.totalBorrowingsToday ?? '-'"
        :icon="HandCoins"
      />
      <AppStatCard
        v-if="canSeeSecurityAlerts"
        :label="t('audit.stats.securityAlerts')"
        :value="auditStore.stats?.securityAlertsCount ?? '-'"
        :sub-label="t('audit.stats.securityAlertsHint')"
        :icon="ShieldAlert"
      />
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 pb-10">
      <!--
        Recent Timeline — super_admin only. `AuditLogPolicy::viewTimeline`
        refuses everyone else, so an archivist would see a permanently empty
        column next to a "Live" badge.
      -->
      <div v-if="canSeeTimeline" class="lg:col-span-4 flex flex-col gap-4 h-full overflow-hidden">
        <div class="flex items-center justify-between shrink-0 px-1">
          <h2 class="text-lg font-display font-semibold text-text-primary">
            {{ t('audit.timeline.title') }}
          </h2>
          <LiveBadge />
        </div>

        <div
          class="bg-white rounded-[10px] border border-border p-6 shadow-sm flex-1 overflow-y-auto"
        >
          <AppErrorState
            v-if="auditStore.timelineError"
            compact
            :title="t('audit.timeline.error')"
            :description="auditStore.timelineError"
            @retry="auditStore.fetchTimeline()"
          />
          <p
            v-else-if="auditStore.timelineLoading && !auditStore.timeline.length"
            class="text-sm text-text-secondary py-4 text-center"
          >
            {{ t('common.loading') }}
          </p>
          <AppEmptyState
            v-else-if="!auditStore.timeline.length"
            compact
            :title="t('audit.timeline.empty')"
          />

          <!--
            Logical utilities throughout: `left-[5px]` pinned the connecting
            rail to the physical left while `dir="rtl"` moved the markers to
            the right, leaving a stray line down the Arabic gutter.
          -->
          <div v-else class="relative ps-1">
            <div
              class="absolute start-[5px] top-2 bottom-0 w-[2px] bg-border z-0 rounded-full"
            ></div>

            <div class="space-y-6">
              <div
                v-for="item in auditStore.timeline"
                :key="item.id"
                class="relative flex items-start gap-4"
              >
                <div
                  class="mt-[5px] shrink-0 w-[12px] h-[12px] rounded-full bg-border border-[2px] border-white relative z-10"
                ></div>

                <div class="flex-1">
                  <div class="flex justify-between gap-2 max-w-full">
                    <div class="flex-1 min-w-0 pe-2">
                      <p class="text-sm font-semibold text-text-primary font-display truncate">
                        {{ actionLabel(item) }}
                      </p>
                      <p class="text-xs text-text-secondary mt-1 font-sans truncate">
                        {{ item.userName ?? '-' }} &middot; {{ roleLabel(item.userRole) }}
                      </p>
                    </div>
                    <div class="shrink-0 text-end mt-0.5">
                      <span
                        class="text-[11px] text-text-secondary font-sans block whitespace-nowrap"
                        >{{ relativeTime(item.timestamp) }}</span
                      >
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Invisible spacer to match pagination height and keep cards equal length -->
        <div class="flex justify-center shrink-0 invisible pointer-events-none opacity-0">
          <AppPagination :total-pages="1" :current-page="1" />
        </div>
      </div>

      <!-- Audit Logs History -->
      <div
        class="flex flex-col gap-4 h-full overflow-hidden"
        :class="canSeeTimeline ? 'lg:col-span-8' : 'lg:col-span-12'"
      >
        <div class="shrink-0 px-1">
          <h2 class="text-lg font-display font-semibold text-text-primary whitespace-nowrap">
            {{ t('audit.logs.title') }}
          </h2>
        </div>

        <div
          class="bg-white rounded-[10px] border border-border flex flex-col items-stretch overflow-hidden shadow-sm flex-1"
        >
          <div
            class="p-5 border-b border-border shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div class="w-full sm:w-[280px]">
              <!--
                The endpoint has no free-text search — `reference_id` is its only
                text filter, and it matches exactly. Labelling the box for what
                it does is the difference between a working control and a dead
                one that silently narrowed nothing.
              -->
              <SearchBar
                v-model="referenceId"
                :placeholder="t('audit.filters.referenceIdPlaceholder')"
              />
            </div>

            <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <AppSelect v-model="action" :options="actionOptions" class="w-full sm:w-[190px]" />
              <AppSelect
                v-if="canFilterByRole"
                v-model="role"
                :options="roleOptions"
                class="w-full sm:w-[150px]"
              />
              <AppSelect v-model="sort" :options="sortOptions" class="w-full sm:w-[150px]" />
            </div>
          </div>

          <AppErrorState
            v-if="table.error.value"
            :title="t('audit.logs.error')"
            :description="table.error.value"
            @retry="table.refresh()"
          />
          <AppEmptyState
            v-else-if="table.isEmpty.value && !table.loading.value"
            :title="hasActiveFilters ? t('audit.logs.noMatchesTitle') : t('audit.logs.emptyTitle')"
            :description="
              hasActiveFilters
                ? t('audit.logs.noMatchesDescription')
                : t('audit.logs.emptyDescription')
            "
          />

          <div v-else class="flex-1 w-full overflow-x-auto min-h-[300px]">
            <DataTable
              :columns="columns"
              variant="plain"
              :loading="table.loading.value"
              class="min-w-[800px]"
            >
              <template #rows>
                <tr
                  v-for="log in table.rows.value"
                  :key="log.id"
                  class="border-t border-border hover:bg-surface transition-colors"
                >
                  <td class="px-5 py-4 text-xs font-sans text-text-primary whitespace-nowrap">
                    {{ formatDateTime(log.timestamp) }}
                  </td>
                  <td
                    class="px-5 py-4 text-xs font-sans font-medium text-text-primary whitespace-nowrap"
                  >
                    {{ log.userName ?? '-' }}
                  </td>
                  <td
                    class="px-5 py-4 text-xs font-sans font-medium text-text-primary whitespace-nowrap"
                  >
                    {{ roleLabel(log.userRole) }}
                  </td>
                  <td class="px-5 py-4 text-xs font-sans text-text-primary min-w-[200px]">
                    {{ actionLabel(log) }}
                  </td>
                  <td class="px-5 py-4 text-xs font-sans text-text-secondary whitespace-nowrap">
                    {{ log.targetEntity ?? '-' }}
                  </td>
                  <td class="px-5 py-4 text-xs font-sans text-text-secondary whitespace-nowrap">
                    {{ log.referenceId ?? '-' }}
                  </td>
                </tr>
              </template>
            </DataTable>
          </div>
        </div>

        <div class="flex justify-center shrink-0">
          <AppPagination
            v-model:current-page="table.page.value"
            :total-pages="table.totalPages.value"
          />
        </div>
      </div>
    </div>
  </div>
</template>
