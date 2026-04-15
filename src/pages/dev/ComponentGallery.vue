<script setup lang="ts">
import { ref } from 'vue'
import AppButton from '@/shared/components/AppButton.vue'
import StatusBadge from '@/shared/components/StatusBadge.vue'
import FormInput from '@/shared/components/FormInput.vue'
import FormField from '@/shared/components/FormField.vue'
import DataTable from '@/shared/components/DataTable.vue'
import AppPagination from '@/shared/components/AppPagination.vue'
import SearchBar from '@/shared/components/SearchBar.vue'
import FilterDropdown from '@/shared/components/FilterDropdown.vue'

const search = ref('')
const filter = ref('')
const page = ref(1)
const inputVal = ref('')

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email', align: 'center' as const },
  { key: 'status', label: 'Status', align: 'center' as const },
  { key: 'actions', label: 'Actions', align: 'center' as const },
]

const filterOptions = [
  { label: 'All Roles', value: '' },
  { label: 'Admin', value: 'admin' },
  { label: 'Archivist', value: 'archivist' },
  { label: 'Faculty Staff', value: 'faculty' },
]
</script>

<template>
  <div class="p-8 space-y-12 max-w-5xl">
    <h1 class="text-2xl font-bold text-text-primary font-sans">Component Gallery</h1>

    <!-- AppButton -->
    <section class="space-y-3">
      <h2 class="text-lg font-semibold text-text-secondary font-sans">AppButton</h2>
      <div class="flex flex-wrap gap-3">
        <AppButton variant="primary">Add User</AppButton>
        <AppButton variant="accent">Save</AppButton>
        <AppButton variant="danger">Delete</AppButton>
        <AppButton variant="ghost">Cancel</AppButton>
        <AppButton variant="primary" :loading="true">Loading…</AppButton>
        <AppButton variant="primary" :disabled="true">Disabled</AppButton>
      </div>
    </section>

    <!-- StatusBadge -->
    <section class="space-y-3">
      <h2 class="text-lg font-semibold text-text-secondary font-sans">StatusBadge</h2>
      <div class="flex flex-wrap gap-3">
        <StatusBadge status="active">Active</StatusBadge>
        <StatusBadge status="inactive">Inactive</StatusBadge>
        <StatusBadge status="pending">Pending</StatusBadge>
        <StatusBadge status="overdue">Overdue</StatusBadge>
        <StatusBadge status="returned">Returned</StatusBadge>
      </div>
    </section>

    <!-- FormField + FormInput -->
    <section class="space-y-3">
      <h2 class="text-lg font-semibold text-text-secondary font-sans">FormField + FormInput</h2>
      <div class="max-w-sm space-y-4">
        <FormField label="Email address" field-id="email">
          <FormInput id="email" v-model="inputVal" type="email" placeholder="Enter your email address" />
        </FormField>
        <FormField label="Password" field-id="password" error="Password is required">
          <FormInput id="password" type="password" placeholder="Enter your password" />
        </FormField>
      </div>
    </section>

    <!-- SearchBar + FilterDropdown -->
    <section class="space-y-3">
      <h2 class="text-lg font-semibold text-text-secondary font-sans">SearchBar + FilterDropdown</h2>
      <div class="flex gap-3 items-center">
        <div class="w-80">
          <SearchBar v-model="search" />
        </div>
        <div class="w-44">
          <FilterDropdown v-model="filter" :options="filterOptions" placeholder="Role" />
        </div>
      </div>
    </section>

    <!-- DataTable -->
    <section class="space-y-3">
      <h2 class="text-lg font-semibold text-text-secondary font-sans">DataTable</h2>
      <DataTable :columns="columns">
        <template #rows>
          <tr class="bg-surface-card border border-border">
            <td class="px-3 py-3 text-sm text-text-primary font-sans">Ahmed Ali</td>
            <td class="px-3 py-3 text-sm text-text-secondary font-sans text-center">a@limu.edu.ly</td>
            <td class="px-3 py-3 text-center"><StatusBadge status="active">Active</StatusBadge></td>
            <td class="px-3 py-3 text-center text-text-secondary text-sm font-sans">—</td>
          </tr>
          <tr class="bg-surface-card border border-border">
            <td class="px-3 py-3 text-sm text-text-primary font-sans">Sara Ahmed</td>
            <td class="px-3 py-3 text-sm text-text-secondary font-sans text-center">sara@limu.edu.ly</td>
            <td class="px-3 py-3 text-center"><StatusBadge status="inactive">Inactive</StatusBadge></td>
            <td class="px-3 py-3 text-center text-text-secondary text-sm font-sans">—</td>
          </tr>
        </template>
      </DataTable>
    </section>

    <!-- AppPagination -->
    <section class="space-y-3">
      <h2 class="text-lg font-semibold text-text-secondary font-sans">AppPagination</h2>
      <AppPagination :current-page="page" :total-pages="10" @change="page = $event" />
      <p class="text-sm text-text-secondary font-sans">Current: page {{ page }}</p>
    </section>
  </div>
</template>
