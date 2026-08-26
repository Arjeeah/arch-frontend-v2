<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import SidebarNavItem from './SidebarNavItem.vue'
import logo from '@/assets/logo.svg'
import { computed, ref, watch } from 'vue'
import type { Component } from 'vue'
import {
  Archive,
  Bell,
  BookCopy,
  ChevronDown,
  ClipboardCheck,
  FileBarChart2,
  FileSpreadsheet,
  FileStack,
  FileType,
  GraduationCap,
  LayoutDashboard,
  ScrollText,
  Search,
  Settings,
  Users,
  UsersRound,
  Workflow,
} from 'lucide-vue-next'

const props = defineProps<{
  /**
   * Role slug of the signed-in user (`super_admin` / `archivist` /
   * `faculty_staff`). Typed as a plain string because shared components may not
   * import the `UserRole` union from `src/modules/auth/`. The layout passes it
   * down from the auth store; `null` hides every role-restricted item.
   */
  role?: string | null
}>()

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

// for type safety
interface NavChild {
  labelKey: string
  to: string
  roles?: readonly string[]
}

interface NavItem {
  key: string
  labelKey: string
  icon: Component
  to?: string
  /**
   * Roles allowed to see the item. Omit to show it to every role; an empty
   * array is an empty allowlist and hides it from everyone, matching how the
   * router reads `meta.roles`.
   */
  roles?: readonly string[]
  children?: NavChild[]
}

/**
 * Every entry must point at a route that exists in `src/app/router/index.ts`
 * with the same `roles`. A routeless entry falls through to the 404 route, so
 * clicking it takes the user nowhere useful — add the module and its route
 * first, then the nav item.
 *
 * Order follows the archive's own workflow: overview and search, then intake
 * (bulk import → monitor → review), then the records those produce, then the
 * academic and physical structure behind them, then oversight and admin.
 *
 * Sub-pages reached by drilling down do not get their own entry — the
 * students, student-documents, users and archive-room detail routes are all
 * opened from their list.
 *
 * Some labels sit under a module namespace (`pipeline.nav.*`,
 * `review.navLabel`) rather than `nav.*`: those streams shipped their own nav
 * strings in their i18n fragment. Both forms resolve the same way through
 * `t()`.
 */
const navItems: NavItem[] = [
  { key: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { key: 'search', labelKey: 'nav.search', icon: Search, to: '/search' },
  {
    key: 'pipeline',
    labelKey: 'pipeline.nav.group',
    icon: Workflow,
    roles: ['super_admin', 'archivist'],
    children: [
      {
        labelKey: 'pipeline.nav.import',
        to: '/pipeline/import',
        roles: ['super_admin', 'archivist'],
      },
      {
        labelKey: 'pipeline.nav.monitor',
        to: '/pipeline/monitor',
        roles: ['super_admin', 'archivist'],
      },
    ],
  },
  { key: 'students', labelKey: 'nav.students', icon: UsersRound, to: '/students' },
  {
    key: 'student-documents',
    labelKey: 'nav.studentDocuments',
    icon: FileStack,
    to: '/student-documents',
    roles: ['super_admin', 'archivist'],
  },
  {
    key: 'users',
    labelKey: 'nav.users',
    icon: Users,
    to: '/users',
    roles: ['super_admin'],
  },
  { key: 'borrowing', labelKey: 'nav.borrowing', icon: BookCopy, to: '/borrowing' },
  {
    key: 'review',
    labelKey: 'review.navLabel',
    icon: ClipboardCheck,
    to: '/review',
    roles: ['super_admin', 'archivist'],
  },
  {
    key: 'faculty-management',
    labelKey: 'nav.facultyManagement',
    icon: GraduationCap,
    roles: ['super_admin', 'archivist'],
    children: [
      { labelKey: 'nav.faculties', to: '/faculties', roles: ['super_admin', 'archivist'] },
      { labelKey: 'nav.programs', to: '/programs', roles: ['super_admin', 'archivist'] },
    ],
  },
  {
    key: 'document-types',
    labelKey: 'nav.documentTypes',
    icon: FileType,
    to: '/document-types',
    roles: ['super_admin', 'archivist'],
  },
  {
    key: 'archive-room',
    labelKey: 'nav.archive',
    icon: Archive,
    to: '/archive-room',
    roles: ['super_admin', 'archivist'],
  },
  {
    key: 'audit',
    labelKey: 'nav.audit',
    icon: ScrollText,
    to: '/audit',
    roles: ['super_admin', 'archivist'],
  },
  {
    key: 'reports',
    labelKey: 'nav.reports',
    icon: FileBarChart2,
    to: '/reports',
    roles: ['super_admin', 'archivist', 'faculty_staff'],
  },
  {
    key: 'imports',
    labelKey: 'nav.imports',
    icon: FileSpreadsheet,
    to: '/imports',
    roles: ['super_admin', 'archivist'],
  },
  {
    key: 'settings',
    labelKey: 'nav.settings',
    icon: Settings,
    to: '/settings',
    roles: ['super_admin'],
  },
  { key: 'notifications', labelKey: 'nav.notifications', icon: Bell, to: '/notifications' },
]

function isAllowed(roles?: readonly string[]): boolean {
  if (!roles) return true
  return props.role != null && roles.includes(props.role)
}

/**
 * Role filtering runs over the whole tree: a parent is dropped when its own
 * roles exclude the user, and also when every one of its children was dropped.
 */
const visibleNavItems = computed<NavItem[]>(() =>
  navItems
    .filter((item) => isAllowed(item.roles))
    .map((item) => ({
      ...item,
      children: item.children?.filter((child) => isAllowed(child.roles)),
    }))
    .filter((item) => Boolean(item.to) || (item.children?.length ?? 0) > 0),
)

/**
 * Sub-menu disclosure.
 *
 * Seeded from the current route and kept in step with it, so a hard refresh, a
 * bookmark or an in-app cross-link (Bulk import ↔ Monitor, Faculties ↔
 * Programs) opens the group it landed in. It used to start `null` and only
 * ever change on click, which rendered the parent highlighted-but-closed with
 * no way to reach the sibling page.
 */
const openDropdown = ref<string | null>(groupForPath(route.path))

function groupForPath(path: string): string | null {
  return (
    navItems.find((item) =>
      item.children?.some((child) => path === child.to || path.startsWith(child.to + '/')),
    )?.key ?? null
  )
}

watch(
  () => route.path,
  (path) => {
    const group = groupForPath(path)
    // Only force it open — a user who collapsed the group they are standing in
    // should not have it spring back on the next navigation inside it.
    if (group && openDropdown.value !== group) openDropdown.value = group
  },
)

function toggleDropdown(key: string) {
  openDropdown.value = openDropdown.value === key ? null : key
}

function isActive(item: NavItem): boolean {
  if (item.children?.some((child) => route.path.startsWith(child.to))) {
    return true
  }
  return item.to ? route.path === item.to || route.path.startsWith(item.to + '/') : false
}
</script>
<template>
  <aside
    class="flex flex-col w-[251px] min-h-screen bg-primary-dark shadow-[0px_2px_4px_rgba(0,0,0,0.25)] shrink-0 p-3 gap-[23px] overflow-y-auto"
  >
    <!-- Logo -->

    <div class="flex items-center py-2">
      <img :src="logo" :alt="t('common.logoAlt')" class="h-14 w-auto" />
    </div>

    <!-- Nav -->
    <nav class="flex flex-col gap-3 flex-1">
      <template v-for="item in visibleNavItems" :key="item.key">
        <SidebarNavItem
          :label="t(item.labelKey)"
          :active="isActive(item)"
          :has-chevron="Boolean(item.children?.length)"
          @click="
            item.children?.length ? toggleDropdown(item.key) : item.to && router.push(item.to)
          "
        >
          <template #icon>
            <component :is="item.icon" class="w-5 h-5" />
          </template>
          <template #chevron v-if="item.children?.length">
            <ChevronDown
              class="transition-transform duration-200"
              :class="{ 'rotate-180': openDropdown === item.key }"
            />
          </template>
        </SidebarNavItem>

        <div v-if="item.children?.length && openDropdown === item.key" class="flex flex-col">
          <RouterLink
            v-for="child in item.children"
            :key="child.to"
            :to="child.to"
            custom
            v-slot="{ navigate }"
          >
            <SidebarNavItem
              :label="t(child.labelKey)"
              class="ps-7 before:content-['•'] before:ms-2"
              :sub-active="route.path === child.to"
              :indent="true"
              @click="navigate()"
            />
          </RouterLink>
        </div>
      </template>
    </nav>
  </aside>
</template>
