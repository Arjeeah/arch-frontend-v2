<!-- src/modules/dashboard/pages/DashboardPage.vue -->
<script setup lang="ts">
import type { Component } from 'vue'
import { File, Users, BookOpen, AlertCircle } from 'lucide-vue-next'
import StatCard from '@/shared/components/StatCard.vue'
import FilesMonthChart from '../components/FilesMonthChart.vue'
import BorrowingsFacultyChart from '../components/BorrowingsFacultyChart.vue'
import SystemHealthCard from '../components/SystemHealthCard.vue'
import UsersByRoleCard from '../components/UsersByRoleCard.vue'
import WeeklyDigestCard from '../components/WeeklyDigestCard.vue'
import RecentActivityTable from '../components/RecentActivityTable.vue'
import { statCards } from '../data/mockDashboard'

const iconMap: Record<string, Component> = { File, Users, BookOpen, AlertCircle }
const getIcon = (name: string): Component => iconMap[name]!
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Page header -->
    <div>
      <h1 class="text-2xl font-display font-semibold text-text-primary">System Dashboard</h1>
      <p class="text-sm text-text-secondary font-sans mt-0.5">Super Admin</p>
    </div>

    <!-- Stat cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard
        v-for="card in statCards"
        :key="card.label"
        :label="card.label"
        :value="card.value"
        :sub-label="card.subLabel"
        :icon="getIcon(card.icon)"
      />
    </div>

    <!-- Charts row -->
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div class="col-span-2">
        <FilesMonthChart />
      </div>
      <BorrowingsFacultyChart />
    </div>

    <!-- Info cards row -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <SystemHealthCard />
      <UsersByRoleCard />
      <WeeklyDigestCard />
    </div>

    <!-- Recent activity -->
    <RecentActivityTable />
  </div>
</template>
