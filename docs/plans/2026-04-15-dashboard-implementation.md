# Dashboard (Super Admin) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the Super Admin dashboard page with stat cards, two charts, three info cards, and a recent activity table — all using mock data.

**Architecture:** A new `src/modules/dashboard/` module with `DashboardPage.vue` composing 7 focused child components. Mock data lives in one file (`data/mockDashboard.ts`). The existing router entry for `/dashboard` is updated to point at `DashboardPage.vue`. `DashboardLayout.vue` needs a one-line fix (`<slot />` → `<RouterView />`) so nested routes render correctly.

**Tech Stack:** Vue 3 (Composition API + `<script setup>`), Tailwind CSS v3, `chart.js@^4`, `vue-chartjs@^5`, Lucide Vue Next, Pinia (read-only, for user name in header)

---

## Task 1: Install chart.js + vue-chartjs and fix DashboardLayout

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `src/app/layouts/DashboardLayout.vue:22`

**Step 1: Install the chart packages**

```bash
cd /Users/arjytalzwy/Desktop/UNI/google/arch-frontend-v2
npm install chart.js vue-chartjs
```

Expected: `added N packages` with no errors.

**Step 2: Fix DashboardLayout — replace `<slot />` with `<RouterView />`**

The layout component is used as a Vue Router parent route. Vue Router renders child routes via `<RouterView />`, not `<slot />`. Open `src/app/layouts/DashboardLayout.vue` and change:

```html
<!-- BEFORE -->
<main class="flex-1 p-6 overflow-auto">
  <slot />
</main>

<!-- AFTER -->
<main class="flex-1 p-6 overflow-auto">
  <RouterView />
</main>
```

**Step 3: Verify dev server still starts**

```bash
npm run dev
```

Navigate to `http://localhost:517X/` — it should redirect to `/login`. Log in and confirm you reach `/dashboard` (still shows the placeholder text for now).

**Step 4: Commit**

```bash
git add src/app/layouts/DashboardLayout.vue package.json package-lock.json
git commit -m "feat: install chart.js + vue-chartjs, fix DashboardLayout RouterView"
```

---

## Task 2: Create mock data file

**Files:**
- Create: `src/modules/dashboard/data/mockDashboard.ts`

**Step 1: Create the file with all mock data**

```ts
// src/modules/dashboard/data/mockDashboard.ts

export const statCards = [
  {
    label: 'Total Files',
    value: '14,525',
    subLabel: 'Active student files',
    icon: 'File',
  },
  {
    label: 'Total Users',
    value: '342',
    subLabel: 'All system users',
    icon: 'Users',
  },
  {
    label: 'Active Borrows',
    value: '7',
    subLabel: 'Files out of archive',
    icon: 'BookOpen',
  },
  {
    label: 'Security Alerts',
    value: '7',
    subLabel: 'Failed login attempts',
    icon: 'AlertCircle',
  },
] as const

export const filesPerMonth = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  data: [60, 75, 90, 105, 110, 95, 100, 115, 125, 130, 140, 150],
}

export const borrowingsByFaculty = {
  labels: ['Medicine', 'Arts', 'Science', 'Business', 'Law'],
  data: [140, 80, 100, 60, 90],
}

export const systemHealth = [
  { label: 'Database', value: '99.8% uptime', status: 'good' },
  { label: 'Storage', value: '62% used', status: 'warning' },
  { label: 'Backup', value: 'Last: 2 hours ago', status: 'neutral' },
] as const

export const usersByRole = [
  { role: 'Super Admin', count: 3 },
  { role: 'Archivist', count: 12 },
  { role: 'Faculty Staff', count: 375 },
]

export const weeklyDigest = [
  { label: 'Overdue Files', value: 8, color: 'danger' },
  { label: 'Due in 7 days', value: 0, color: 'success' },
  { label: 'Weekly Borrowing', value: 42, color: 'primary' },
  { label: 'Storage Usage', value: '62%', color: 'warning' },
] as const

export const recentActivity = [
  { action: 'File Borrowed', user: 'Nour Khalid', file: 'File: 2020213', timestamp: '2 hours ago' },
  { action: 'File Returned', user: 'Ahmed Ali', file: 'File: 2020214', timestamp: '4 hours ago' },
  { action: 'File Overdue', user: 'Mohammed', file: 'File: 2020215', timestamp: '14 hours ago' },
  { action: 'File Returned', user: 'Abdullah Omar', file: 'File: 2020216', timestamp: '2 hours ago' },
  { action: 'OCR Completed', user: 'Sara Ali', file: 'File: 2020217', timestamp: '7 hours ago' },
]
```

**Step 2: Commit**

```bash
git add src/modules/dashboard/data/mockDashboard.ts
git commit -m "feat(dashboard): add mock data"
```

---

## Task 3: StatCard component

**Files:**
- Create: `src/modules/dashboard/components/StatCard.vue`

**Step 1: Create the component**

```vue
<!-- src/modules/dashboard/components/StatCard.vue -->
<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  label: string
  value: string | number
  subLabel: string
  icon: Component
}>()
</script>

<template>
  <div class="bg-white rounded-[10px] border border-border p-5 flex items-start justify-between shadow-sm">
    <div class="flex flex-col gap-1">
      <p class="text-xs text-text-secondary font-display font-normal">{{ label }}</p>
      <p class="text-3xl font-display font-semibold text-text-primary leading-tight">{{ value }}</p>
      <p class="text-xs text-text-muted font-sans">{{ subLabel }}</p>
    </div>
    <div class="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
      <component :is="icon" class="w-5 h-5" />
    </div>
  </div>
</template>
```

**Step 2: Verify it compiles — temporarily import it in ComponentGallery or just run `npm run build` to type-check**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors related to StatCard.

**Step 3: Commit**

```bash
git add src/modules/dashboard/components/StatCard.vue
git commit -m "feat(dashboard): add StatCard component"
```

---

## Task 4: FilesMonthChart (Line chart)

**Files:**
- Create: `src/modules/dashboard/components/FilesMonthChart.vue`

**Step 1: Create the component**

```vue
<!-- src/modules/dashboard/components/FilesMonthChart.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from 'chart.js'
import { filesPerMonth } from '../data/mockDashboard'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler)

const chartData = computed(() => ({
  labels: filesPerMonth.labels,
  datasets: [
    {
      label: 'Files',
      data: filesPerMonth.data,
      borderColor: '#2F6FB2',
      backgroundColor: 'rgba(47, 111, 178, 0.08)',
      borderWidth: 2,
      pointRadius: 3,
      pointBackgroundColor: '#2F6FB2',
      fill: true,
      tension: 0.4,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    title: { display: false },
    tooltip: { mode: 'index' as const, intersect: false },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { font: { size: 11 }, color: '#727272' },
    },
    y: {
      min: 0,
      max: 180,
      grid: { color: '#F0F0F0' },
      border: { display: false, dash: [4, 4] },
      ticks: { stepSize: 45, font: { size: 11 }, color: '#727272' },
    },
  },
}
</script>

<template>
  <div class="bg-white rounded-[10px] border border-border p-5 shadow-sm">
    <h3 class="text-sm font-display font-medium text-text-primary mb-4">Files / Month</h3>
    <div class="h-[200px]">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
```

**Step 2: Build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/modules/dashboard/components/FilesMonthChart.vue
git commit -m "feat(dashboard): add FilesMonthChart line chart"
```

---

## Task 5: BorrowingsFacultyChart (Bar chart)

**Files:**
- Create: `src/modules/dashboard/components/BorrowingsFacultyChart.vue`

**Step 1: Create the component**

```vue
<!-- src/modules/dashboard/components/BorrowingsFacultyChart.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
} from 'chart.js'
import { borrowingsByFaculty } from '../data/mockDashboard'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip)

const chartData = computed(() => ({
  labels: borrowingsByFaculty.labels,
  datasets: [
    {
      label: 'Borrowings',
      data: borrowingsByFaculty.data,
      backgroundColor: '#2F6FB2',
      borderRadius: 4,
      borderSkipped: false,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    title: { display: false },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { font: { size: 10 }, color: '#727272' },
    },
    y: {
      min: 0,
      max: 160,
      grid: { color: '#F0F0F0' },
      border: { display: false },
      ticks: { stepSize: 40, font: { size: 11 }, color: '#727272' },
    },
  },
}
</script>

<template>
  <div class="bg-white rounded-[10px] border border-border p-5 shadow-sm">
    <h3 class="text-sm font-display font-medium text-text-primary mb-4">Borrowings by Faculty</h3>
    <div class="h-[200px]">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
```

**Step 2: Build check**

```bash
npm run build 2>&1 | tail -20
```

**Step 3: Commit**

```bash
git add src/modules/dashboard/components/BorrowingsFacultyChart.vue
git commit -m "feat(dashboard): add BorrowingsFacultyChart bar chart"
```

---

## Task 6: SystemHealthCard, UsersByRoleCard, WeeklyDigestCard

**Files:**
- Create: `src/modules/dashboard/components/SystemHealthCard.vue`
- Create: `src/modules/dashboard/components/UsersByRoleCard.vue`
- Create: `src/modules/dashboard/components/WeeklyDigestCard.vue`

**Step 1: Create SystemHealthCard**

```vue
<!-- src/modules/dashboard/components/SystemHealthCard.vue -->
<script setup lang="ts">
import { Settings } from 'lucide-vue-next'
import { systemHealth } from '../data/mockDashboard'

const badgeClass: Record<string, string> = {
  good: 'text-success bg-success-bg',
  warning: 'text-warning bg-warning/10',
  neutral: 'text-text-secondary bg-surface',
}
</script>

<template>
  <div class="bg-white rounded-[10px] border border-border p-5 shadow-sm flex flex-col gap-4">
    <h3 class="text-sm font-display font-medium text-text-primary">System Health</h3>
    <div class="flex flex-col gap-3 flex-1">
      <div
        v-for="item in systemHealth"
        :key="item.label"
        class="flex items-center justify-between"
      >
        <span class="text-sm text-text-secondary font-sans">{{ item.label }}</span>
        <span
          class="text-xs font-display font-medium px-2 py-0.5 rounded"
          :class="badgeClass[item.status]"
        >
          {{ item.value }}
        </span>
      </div>
    </div>
    <RouterLink
      to="/settings"
      class="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-primary text-white text-sm font-display font-medium hover:bg-primary-mid transition-colors"
    >
      <Settings class="w-4 h-4" />
      System Settings
    </RouterLink>
  </div>
</template>
```

**Step 2: Create UsersByRoleCard**

```vue
<!-- src/modules/dashboard/components/UsersByRoleCard.vue -->
<script setup lang="ts">
import { Users } from 'lucide-vue-next'
import { usersByRole } from '../data/mockDashboard'
</script>

<template>
  <div class="bg-white rounded-[10px] border border-border p-5 shadow-sm flex flex-col gap-4">
    <h3 class="text-sm font-display font-medium text-text-primary">Users by Role</h3>
    <table class="w-full flex-1">
      <thead>
        <tr class="border-b border-border">
          <th class="text-left text-xs text-text-muted font-display font-medium pb-2">Role</th>
          <th class="text-right text-xs text-text-muted font-display font-medium pb-2">Count</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in usersByRole"
          :key="row.role"
          class="border-b border-border last:border-0"
        >
          <td class="py-2 text-sm text-text-primary font-sans">{{ row.role }}</td>
          <td class="py-2 text-sm text-text-primary font-sans text-right">{{ row.count }}</td>
        </tr>
      </tbody>
    </table>
    <RouterLink
      to="/users"
      class="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-primary text-white text-sm font-display font-medium hover:bg-primary-mid transition-colors"
    >
      <Users class="w-4 h-4" />
      View Users
    </RouterLink>
  </div>
</template>
```

**Step 3: Create WeeklyDigestCard**

```vue
<!-- src/modules/dashboard/components/WeeklyDigestCard.vue -->
<script setup lang="ts">
import { weeklyDigest } from '../data/mockDashboard'

const badgeClass: Record<string, string> = {
  danger: 'bg-danger text-white',
  success: 'bg-success text-white',
  primary: 'bg-primary text-white',
  warning: 'bg-warning text-white',
}
</script>

<template>
  <div class="bg-white rounded-[10px] border border-border p-5 shadow-sm flex flex-col gap-4">
    <h3 class="text-sm font-display font-medium text-text-primary">Weekly Digest</h3>
    <div class="flex flex-col gap-3 flex-1">
      <div
        v-for="item in weeklyDigest"
        :key="item.label"
        class="flex items-center justify-between"
      >
        <span class="text-sm text-text-secondary font-sans">{{ item.label }}</span>
        <span
          class="text-xs font-display font-semibold px-2 py-0.5 rounded min-w-[28px] text-center"
          :class="badgeClass[item.color]"
        >
          {{ item.value }}
        </span>
      </div>
    </div>
    <button
      disabled
      class="flex items-center justify-center w-full py-2 rounded-lg bg-primary/40 text-white text-sm font-display font-medium cursor-not-allowed"
    >
      View Full Digest
    </button>
  </div>
</template>
```

**Step 4: Build check**

```bash
npm run build 2>&1 | tail -20
```

**Step 5: Commit**

```bash
git add src/modules/dashboard/components/SystemHealthCard.vue src/modules/dashboard/components/UsersByRoleCard.vue src/modules/dashboard/components/WeeklyDigestCard.vue
git commit -m "feat(dashboard): add SystemHealthCard, UsersByRoleCard, WeeklyDigestCard"
```

---

## Task 7: RecentActivityTable

**Files:**
- Create: `src/modules/dashboard/components/RecentActivityTable.vue`

**Step 1: Create the component**

```vue
<!-- src/modules/dashboard/components/RecentActivityTable.vue -->
<script setup lang="ts">
import { recentActivity } from '../data/mockDashboard'

const actionColor: Record<string, string> = {
  'File Borrowed': 'text-primary',
  'File Returned': 'text-success',
  'File Overdue': 'text-danger',
  'OCR Completed': 'text-text-secondary',
}
</script>

<template>
  <div class="bg-white rounded-[10px] border border-border shadow-sm overflow-hidden">
    <div class="px-5 py-4 border-b border-border">
      <h3 class="text-sm font-display font-medium text-text-primary">Recent Activity</h3>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-surface-table">
          <tr>
            <th class="text-left text-xs text-text-muted font-display font-medium px-5 py-3">Action</th>
            <th class="text-left text-xs text-text-muted font-display font-medium px-5 py-3">User</th>
            <th class="text-left text-xs text-text-muted font-display font-medium px-5 py-3">File</th>
            <th class="text-right text-xs text-text-muted font-display font-medium px-5 py-3">Timestamp</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, i) in recentActivity"
            :key="i"
            class="border-t border-border hover:bg-surface transition-colors"
          >
            <td class="px-5 py-3 text-sm font-sans font-medium" :class="actionColor[row.action] ?? 'text-text-primary'">
              {{ row.action }}
            </td>
            <td class="px-5 py-3 text-sm text-text-primary font-sans">{{ row.user }}</td>
            <td class="px-5 py-3 text-sm text-text-secondary font-sans">{{ row.file }}</td>
            <td class="px-5 py-3 text-sm text-text-muted font-sans text-right">{{ row.timestamp }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
```

**Step 2: Build check**

```bash
npm run build 2>&1 | tail -20
```

**Step 3: Commit**

```bash
git add src/modules/dashboard/components/RecentActivityTable.vue
git commit -m "feat(dashboard): add RecentActivityTable"
```

---

## Task 8: DashboardPage + router update

**Files:**
- Create: `src/modules/dashboard/pages/DashboardPage.vue`
- Modify: `src/app/router/index.ts:24` — replace PlaceholderPage with lazy import

**Step 1: Create DashboardPage**

```vue
<!-- src/modules/dashboard/pages/DashboardPage.vue -->
<script setup lang="ts">
import { File, Users, BookOpen, AlertCircle } from 'lucide-vue-next'
import StatCard from '../components/StatCard.vue'
import FilesMonthChart from '../components/FilesMonthChart.vue'
import BorrowingsFacultyChart from '../components/BorrowingsFacultyChart.vue'
import SystemHealthCard from '../components/SystemHealthCard.vue'
import UsersByRoleCard from '../components/UsersByRoleCard.vue'
import WeeklyDigestCard from '../components/WeeklyDigestCard.vue'
import RecentActivityTable from '../components/RecentActivityTable.vue'
import { statCards } from '../data/mockDashboard'

const iconMap = { File, Users, BookOpen, AlertCircle } as Record<string, unknown>
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Page header -->
    <div>
      <h1 class="text-2xl font-display font-semibold text-text-primary">System Dashboard</h1>
      <p class="text-sm text-text-secondary font-sans mt-0.5">Super Admin</p>
    </div>

    <!-- Stat cards -->
    <div class="grid grid-cols-4 gap-4">
      <StatCard
        v-for="card in statCards"
        :key="card.label"
        :label="card.label"
        :value="card.value"
        :sub-label="card.subLabel"
        :icon="iconMap[card.icon]"
      />
    </div>

    <!-- Charts row -->
    <div class="grid grid-cols-3 gap-4">
      <div class="col-span-2">
        <FilesMonthChart />
      </div>
      <BorrowingsFacultyChart />
    </div>

    <!-- Info cards row -->
    <div class="grid grid-cols-3 gap-4">
      <SystemHealthCard />
      <UsersByRoleCard />
      <WeeklyDigestCard />
    </div>

    <!-- Recent activity -->
    <RecentActivityTable />
  </div>
</template>
```

**Step 2: Update the router**

In `src/app/router/index.ts`, remove the `PlaceholderPage` inline component and update the dashboard child route:

```ts
// REMOVE these lines at the top:
import { defineComponent, h } from 'vue'

const PlaceholderPage = defineComponent({
  name: 'PlaceholderPage',
  render: () => h('div', { class: 'p-6 text-text-primary' }, 'arch-frontend-v2 — ready'),
})

// REPLACE the dashboard child route:
// BEFORE:
{ path: 'dashboard', component: PlaceholderPage },

// AFTER:
{ path: 'dashboard', component: () => import('@/modules/dashboard/pages/DashboardPage.vue') },
```

The full updated `src/app/router/index.ts` should look like:

```ts
import { createRouter, createWebHistory } from 'vue-router'
import DashboardLayout from '@/app/layouts/DashboardLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      component: () => import('@/modules/auth/pages/LoginPage.vue'),
      meta: { guest: true },
    },
    {
      path: '/',
      component: DashboardLayout,
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/dashboard' },
        { path: 'dashboard', component: () => import('@/modules/dashboard/pages/DashboardPage.vue') },
      ],
    },
    {
      path: '/_dev',
      component: () => import('@/pages/dev/ComponentGallery.vue'),
    },
  ],
})

router.beforeEach(to => {
  const isAuthenticated = !!localStorage.getItem('auth_token')
  if (to.meta.requiresAuth && !isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guest && isAuthenticated) {
    return { path: '/dashboard' }
  }
})

export default router
```

**Step 3: Build check — must pass with zero errors**

```bash
npm run build 2>&1 | tail -30
```

Expected: `built in Xs` with no errors or warnings about missing imports.

**Step 4: Start dev server and verify visually**

```bash
npm run dev
```

Open `http://localhost:517X/dashboard` (or log in first). Confirm:
- [ ] Page title "System Dashboard" + "Super Admin" subtitle visible
- [ ] 4 stat cards render in a row with icons
- [ ] Line chart fills its container with Jan–Dec labels
- [ ] Bar chart shows 5 faculty bars
- [ ] System Health, Users by Role, Weekly Digest cards all render
- [ ] Recent Activity table shows 5 rows with correct color coding
- [ ] No console errors

**Step 5: Commit**

```bash
git add src/modules/dashboard/pages/DashboardPage.vue src/app/router/index.ts
git commit -m "feat(dashboard): add DashboardPage and wire router"
```
