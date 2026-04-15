<script setup lang="ts">
import { useRoute } from 'vue-router'
import SidebarNavItem from './SidebarNavItem.vue'
import logo from '@/assets/logo.svg'
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  BookCopy,
  GraduationCap,
  ScrollText,
  BarChart2,
  Settings,
} from 'lucide-vue-next'

const route = useRoute()

const navItems = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { key: 'users', label: 'User Management', icon: Users, to: '/users' },
  { key: 'archive', label: 'Archive Room', icon: FolderOpen, to: '/archive-room' },
  { key: 'borrowing', label: 'Borrowing', icon: BookCopy, to: '/borrowing' },
  { key: 'faculties', label: 'Faculty & Programs', icon: GraduationCap, to: '/faculties' },
  { key: 'audit', label: 'Audit Logs', icon: ScrollText, to: '/audit' },
  { key: 'reports', label: 'Reports', icon: BarChart2, to: '/reports' },
  { key: 'settings', label: 'Settings', icon: Settings, to: '/settings' },
]

function isActive(to: string) {
  return route.path.startsWith(to)
}
</script>

<template>
  <aside
    class="flex flex-col w-[251px] h-full bg-primary-dark shadow-[0px_2px_4px_rgba(0,0,0,0.25)] shrink-0 p-3 gap-[23px] overflow-y-auto"
  >
    <!-- Logo -->
    <div class="flex items-center py-2">
      <img :src="logo" alt="ARCH system" class="h-14 w-auto" />
    </div>

    <!-- Nav -->
    <nav class="flex flex-col gap-3 flex-1">
      <RouterLink
        v-for="item in navItems"
        :key="item.key"
        :to="item.to"
        custom
        v-slot="{ navigate }"
      >
        <SidebarNavItem
          :label="item.label"
          :active="isActive(item.to)"
          @click="navigate"
        >
          <template #icon>
            <component :is="item.icon" class="w-5 h-5" />
          </template>
        </SidebarNavItem>
      </RouterLink>
    </nav>
  </aside>
</template>
