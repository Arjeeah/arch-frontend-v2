<script setup lang="ts">
import { computed } from 'vue'
import AdminDashboardPage from './AdminDashboardPage.vue'
import ArchivistDashboardPage from './ArchivistDashboardPage.vue'
import FacultyDashboardPage from './FacultyDashboardPage.vue'
import { readSessionRole } from '../utils/role'

/**
 * `/dashboard` is the app's HOME_PATH: the router sends every refused
 * navigation here, so the route itself must stay open to all three roles and
 * cannot carry a `meta.roles` allowlist. The role split therefore happens
 * inside the page — each role gets the dashboard backed by the endpoint it is
 * actually allowed to call:
 *
 *   super_admin   → /v1/dashboard + audit counters + user head count + digest
 *   archivist     → /v1/dashboard/archivist (+ /v1/dashboard for storage)
 *   faculty_staff → /v1/faculty-staff/dashboard
 *
 * Calling the wrong one is not a cosmetic mistake: the archivist endpoint
 * explicitly 403s a super_admin, and the admin endpoint 403s faculty staff.
 */
const role = computed(() => readSessionRole())
</script>

<template>
  <ArchivistDashboardPage v-if="role === 'archivist'" />
  <FacultyDashboardPage v-else-if="role === 'faculty_staff'" />
  <!-- super_admin, and the fallback for a session with no readable role. -->
  <AdminDashboardPage v-else />
</template>
