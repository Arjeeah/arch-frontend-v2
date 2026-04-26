<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import SidebarNavItem from './SidebarNavItem.vue'
import logo from '@/assets/logo.svg'
import { ref } from 'vue'
import type { Component } from 'vue'
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  BookCopy,
  GraduationCap,
  ScrollText,
  BarChart2,
  Settings,
  ChevronDown,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

// for type safety
interface NavItem {
  key: string
  label: string
  icon: Component
  to?: string
  children?: { label: string; to: string }[]
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { key: 'users', label: 'User Management', icon: Users, to: '/users' },
  { key: 'archive', label: 'Archive Room', icon: FolderOpen, to: '/archive-room' },
  { key: 'borrowing', label: 'Borrowing', icon: BookCopy, to: '/borrowing' },
  {
    key: 'faculty-management',
    label: 'Faculty Management',
    icon: GraduationCap,
    children: [
      { label: 'Faculties', to: '/faculties' },
      { label: 'Programs', to: '/programs' },
    ],
  },
  { key: 'audit', label: 'Audit Logs', icon: ScrollText, to: '/audit' },
  { key: 'reports', label: 'Reports', icon: BarChart2, to: '/reports' },
  { key: 'settings', label: 'Settings', icon: Settings, to: '/settings' },
]

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
      <template v-for="item in navItems" :key="item.key">
        <SidebarNavItem
          :label="item.label"
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
              :label="child.label"
              class="pl-7 before:content-['•'] before:ml-2"
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
