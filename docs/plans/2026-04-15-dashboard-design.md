# Dashboard (Super Admin) Design

**Goal:** Build the Super Admin dashboard page with stat cards, charts, system health, users by role, weekly digest, and recent activity — using mock data.

**Architecture:** Single `/dashboard` route renders `DashboardPage.vue`, which composes 7 child components. All data lives in `data/mockDashboard.ts` and is imported directly — no API calls in this phase.

**Tech Stack:** Vue 3, Tailwind CSS, `chart.js` + `vue-chartjs`, Lucide Vue Next, Pinia (auth store for user name/role display only)

---

## Page Layout

`DashboardPage.vue` sits inside the existing `DashboardLayout` (sidebar + topbar). Content area rows:

```
Row 1: Page title "System Dashboard" + "Super Admin" subtitle
Row 2: 4 stat cards (equal width grid)
Row 3: FilesMonthChart (2/3) | BorrowingsFacultyChart (1/3)
Row 4: SystemHealthCard | UsersByRoleCard | WeeklyDigestCard  (3 equal cols)
Row 5: RecentActivityTable (full width)
```

---

## Components

### `StatCard.vue`
Props: `label: string`, `value: string | number`, `subLabel: string`, `icon: Component`

4 instances:
| Label | Value | Sub-label | Icon |
|-------|-------|-----------|------|
| Total Files | 14,525 | Active student files | `File` |
| Total Users | 342 | All system users | `Users` |
| Active Borrows | 7 | Files out of archive | `BookOpen` |
| Security Alerts | 7 | Failed login attempts | `AlertCircle` |

### `FilesMonthChart.vue`
- `vue-chartjs` `<Line>` component
- X-axis: Jan–Dec, Y-axis: 0–180
- Dataset: blue line (#2F6FB2), no fill
- Mock data curve: [60, 75, 90, 105, 110, 95, 100, 115, 125, 130, 140, 150]

### `BorrowingsFacultyChart.vue`
- `vue-chartjs` `<Bar>` component
- X-axis: Medicine, Arts, Science, Business, Law
- Y-axis: 0–160
- Mock data: [140, 80, 100, 60, 90]
- Bar color: #2F6FB2

### `SystemHealthCard.vue`
3 metric rows:
- Database → "99.8% uptime" (green badge)
- Storage → "62% used" (orange badge)
- Backup → "Last: 2 hours ago" (gray text)

Footer: "System Settings" button → links to `/settings`

### `UsersByRoleCard.vue`
Simple role/count table:
- Super Admin: 3
- Archivist: 12
- Faculty Staff: 375

Footer: "View Users" button → links to `/user-management`

### `WeeklyDigestCard.vue`
4 rows with colored count badges:
- Overdue Files: 8 (red)
- Due in 7 days: 0 (green)
- Weekly Borrowing: 42 (blue)
- Storage Usage: 62% (orange)

Footer: "View Full Digest" button (disabled, no route yet)

### `RecentActivityTable.vue`
Full-width table, 5 mock rows:

| Action | User | File | Timestamp |
|--------|------|------|-----------|
| File Borrowed | Nour Khalid | File: 2020213 | 2 hours ago |
| File Returned | Ahmed Ali | File: 2020214 | 4 hours ago |
| File Overdue | Mohammed | File: 2020215 | 14 hours ago |
| File Returned | Abdullah Omar | File: 2020216 | 2 hours ago |
| OCR Completed | Sara Ali | File: 2020217 | 7 hours ago |

Action color coding: Borrowed → blue, Returned → green, Overdue → red, OCR Completed → gray

---

## Data

`src/modules/dashboard/data/mockDashboard.ts` — single source for all mock numbers, imported by `DashboardPage.vue` and passed as props to child components.

---

## Routing

Update `src/app/router/index.ts`:
```ts
{ path: 'dashboard', component: () => import('@/modules/dashboard/pages/DashboardPage.vue') }
```

---

## Dependencies

```bash
npm install chart.js vue-chartjs
```
