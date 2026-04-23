<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Clock, LogIn, User } from 'lucide-vue-next'
import ExportButton from '@/shared/components/ExportButton.vue'
import LiveBadge from '@/shared/components/LiveBadge.vue'
import StatCard from '@/shared/components/StatCard.vue'
import SearchBar from '@/shared/components/SearchBar.vue'
import AppSelect from '@/shared/components/AppSelect.vue'
import DataTable from '@/shared/components/DataTable.vue'
import AppPagination from '@/shared/components/AppPagination.vue'
import { useAuditStore } from '../stores/useAuditStore'
import { auditApi } from '../api/AuditApi'

const auditStore = useAuditStore()

const search = ref('')
const role = ref('')
const order = ref('name-asc')
const currentPage = ref(1)

const roleOptions = [
  { value: '', label: 'All Roles' },
  { value: 'Super Admin', label: 'Super Admin' },
  { value: 'Faculty Staff', label: 'Faculty Staff' },
  { value: 'Archivist', label: 'Archivist' },
]

const logsColumns = [
  { key: 'timestamp', label: 'Timestamp' },
  { key: 'user', label: 'User' },
  { key: 'role', label: 'Role' },
  { key: 'action', label: 'Action' },
  { key: 'targetEntity', label: 'Target Entity' },
  { key: 'referenceId', label: 'Reference ID' },
]

onMounted(() => {
  auditStore.fetchDashboardData()
  fetchLogs()
})

watch([search, role, currentPage], () => {
  fetchLogs()
})

const fetchLogs = () => {
  auditStore.fetchLogs({
    search: search.value,
    role: role.value,
    page: currentPage.value,
  })
}

const handleExport = async () => {
  try {
    const response = await auditApi.exportReport()
    const url = window.URL.createObjectURL(new Blob([response.data as Blob]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'audit-report.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (err) {
    console.error('Failed to export report:', err)
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Page Header -->
    <div class="flex items-center justify-between shrink-0">
      <h1 class="text-2xl font-display font-semibold text-text-primary">Audit logs & Timeline</h1>
      <ExportButton @click="handleExport" />
    </div>

    <!-- Stat Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
      <StatCard
        label="Total Operations Today"
        :value="auditStore.stats?.totalOperationsToday ?? '1,524'"
        :sub-label="auditStore.stats?.operationsChange ?? '+12% from yesterday'"
        :icon="Clock"
      />
      <StatCard
        label="Users logged in"
        :value="auditStore.stats?.usersLoggedIn ?? '41'"
        :icon="LogIn"
      />
      <StatCard label="Total Users" :value="auditStore.stats?.totalUsers ?? '90'" :icon="User" />
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 pb-10">
      <!-- Recent Timeline Column -->
      <div class="lg:col-span-4 flex flex-col gap-4 h-full overflow-hidden">
        <div class="flex items-center justify-between shrink-0 px-1">
          <h2 class="text-lg font-display font-semibold text-text-primary">Recent Timeline</h2>
          <LiveBadge />
        </div>

        <div
          class="bg-white rounded-[10px] border border-border p-6 shadow-sm flex-1 overflow-y-auto"
        >
          <div
            v-if="auditStore.timeline.length === 0"
            class="text-sm text-text-secondary py-4 text-center"
          >
            No recent activity.
          </div>

          <div v-else class="relative pl-1">
            <!-- Continuous vertical line -->
            <div
              class="absolute left-[5px] top-2 bottom-0 w-[2px] bg-border z-0 rounded-full"
            ></div>

            <div class="space-y-6">
              <div
                v-for="item in auditStore.timeline"
                :key="item.id"
                class="relative flex items-start gap-4"
              >
                <!-- Timeline marker/dot -->
                <div
                  class="mt-[5px] shrink-0 w-[12px] h-[12px] rounded-full bg-border border-[2px] border-white relative z-10"
                ></div>

                <div class="flex-1">
                  <div class="flex justify-between gap-2 max-w-full">
                    <div class="flex-1 min-w-0 pr-2">
                      <p class="text-sm font-semibold text-text-primary font-display truncate">
                        {{ item.action }}
                      </p>
                      <p class="text-xs text-text-secondary mt-1 font-sans truncate">
                        {{ item.userName }} &middot; {{ item.userRole }}
                      </p>
                    </div>
                    <div class="shrink-0 text-right mt-0.5">
                      <span
                        class="text-[11px] text-text-secondary font-sans block whitespace-nowrap"
                        >{{ item.timestamp }}</span
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

      <!-- Audit Logs History Column -->
      <div class="lg:col-span-8 flex flex-col gap-4 h-full overflow-hidden">
        <div class="shrink-0 px-1">
          <h2 class="text-lg font-display font-semibold text-text-primary whitespace-nowrap">
            Audit Logs History
          </h2>
        </div>

        <div
          class="bg-white rounded-[10px] border border-border flex flex-col items-stretch overflow-hidden shadow-sm flex-1"
        >
          <div
            class="p-5 border-b border-border shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div class="w-full sm:w-[320px]">
              <SearchBar v-model="search" placeholder="Search" />
            </div>

            <div class="flex items-center gap-3 w-full sm:w-auto">
              <!-- Sort / Order filter -->
              <AppSelect
                v-model="order"
                :options="[
                  { value: 'name-asc', label: 'Order Name A-Z' },
                  { value: 'name-desc', label: 'Order Name Z-A' },
                ]"
                class="w-full sm:w-[150px]"
              />

              <!-- Role filter -->
              <AppSelect v-model="role" :options="roleOptions" class="w-full sm:w-[130px]" />
            </div>
          </div>

          <div class="flex-1 w-full overflow-x-auto min-h-[300px]">
            <DataTable :columns="logsColumns" variant="plain" class="min-w-[800px]">
              <template #rows>
                <tr v-if="auditStore.logsLoading">
                  <td colspan="6" class="px-5 py-8 text-center text-sm text-text-secondary">
                    Loading logs...
                  </td>
                </tr>
                <tr v-else-if="auditStore.logs.length === 0">
                  <td colspan="6" class="px-5 py-8 text-center text-sm text-text-secondary">
                    No logs found.
                  </td>
                </tr>

                <tr
                  v-for="log in auditStore.logs"
                  :key="log.id"
                  class="border-t border-border hover:bg-surface transition-colors"
                >
                  <td class="px-5 py-4 text-xs font-sans text-text-primary whitespace-nowrap">
                    {{ log.timestamp }}
                  </td>
                  <td
                    class="px-5 py-4 text-xs font-sans font-medium text-text-primary whitespace-nowrap"
                  >
                    {{ log.userName }}
                  </td>
                  <td
                    class="px-5 py-4 text-xs font-sans font-medium text-text-primary whitespace-nowrap"
                  >
                    {{ log.userRole }}
                  </td>
                  <td class="px-5 py-4 text-xs font-sans text-text-primary min-w-[200px]">
                    {{ log.action }}
                  </td>
                  <td class="px-5 py-4 text-xs font-sans text-text-secondary whitespace-nowrap">
                    {{ log.targetEntity }}
                  </td>
                  <td class="px-5 py-4 text-xs font-sans text-text-secondary whitespace-nowrap">
                    {{ log.referenceId }}
                  </td>
                </tr>
              </template>
            </DataTable>
          </div>
        </div>

        <div class="flex justify-center shrink-0">
          <AppPagination v-model:current-page="currentPage" :total-pages="auditStore.totalPages" />
        </div>
      </div>
    </div>
  </div>
</template>
