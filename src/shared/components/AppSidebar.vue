<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import SidebarNavItem from './SidebarNavItem.vue'
import logo from '@/assets/logo.svg'
import { computed, ref } from 'vue'
import type { Component } from 'vue'
import {
  LayoutDashboard,
  Users,
  BookCopy,
  GraduationCap,
  ScrollText,
  ChevronDown,
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
 * Waiting on their modules (icons already imported below when they land):
 * archive room (`/archive-room`), reports (`/reports`), settings (`/settings`).
 */
const navItems: NavItem[] = [
  { key: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, to: '/dashboard' },
  {
    key: 'users',
    labelKey: 'nav.users',
    icon: Users,
    to: '/users',
    roles: ['super_admin'],
  },
  { key: 'borrowing', labelKey: 'nav.borrowing', icon: BookCopy, to: '/borrowing' },
  {
    key: 'faculty-management',
    labelKey: 'nav.facultyManagement',
    icon: GraduationCap,
    roles: ['super_admin', 'archivist'],
    children: [
      { labelKey: 'nav.faculties', to: '/faculties', roles: ['super_admin', 'archivist'] },
      //{ labelKey: 'nav.programs', to: '/programs' },
    ],
  },
  {
    key: 'audit',
    labelKey: 'nav.audit',
    icon: ScrollText,
    to: '/audit',
    roles: ['super_admin', 'archivist'],
  },
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

// sub-menu drop down
const openDropdown = ref<string | null>(null)
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
      <img :src="logo" alt="ARCH system" class="h-14 w-auto" />
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
