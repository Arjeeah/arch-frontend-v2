<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Pencil, Trash2 } from 'lucide-vue-next'
import DataTable from '@/shared/components/DataTable.vue'
import StudentStatusBadge from './StudentStatusBadge.vue'
import { academicLabel, drawerLabel, type Student } from '../types'

defineProps<{
  students: Student[]
  loading?: boolean
  /** Edit/delete controls are hidden from roles that may only read the list. */
  canManage?: boolean
  /** Faculty staff have no detail route, so their rows render as plain text. */
  canOpenDetail?: boolean
}>()

const emit = defineEmits<{ edit: [student: Student]; delete: [student: Student] }>()

const { t, locale } = useI18n()

const columns = computed(() => [
  { key: 'studentNumber', label: t('students.columns.studentNumber') },
  { key: 'name', label: t('students.columns.name') },
  { key: 'faculty', label: t('students.columns.faculty') },
  { key: 'program', label: t('students.columns.program') },
  { key: 'enrollmentYear', label: t('students.columns.enrollmentYear') },
  { key: 'location', label: t('students.columns.location') },
  { key: 'status', label: t('students.columns.status') },
  { key: 'actions', label: t('students.columns.actions'), align: 'right' as const },
])
</script>

<template>
  <DataTable :columns="columns" :loading="loading">
    <template #rows>
      <tr
        v-for="student in students"
        :key="student.id"
        class="border-t border-border hover:bg-surface"
      >
        <td class="px-3 py-3 font-sans text-sm text-text-secondary">
          {{ student.studentNumber || '-' }}
        </td>
        <td class="px-3 py-3 font-sans text-sm text-text-primary">
          <RouterLink
            v-if="canOpenDetail"
            :to="`/students/${student.id}`"
            class="font-medium text-primary hover:underline"
          >
            {{ student.name || '-' }}
          </RouterLink>
          <span v-else class="font-medium">{{ student.name || '-' }}</span>
        </td>
        <td class="px-3 py-3 font-sans text-sm text-text-secondary">
          {{ academicLabel(student.faculty, locale) || '-' }}
        </td>
        <td class="px-3 py-3 font-sans text-sm text-text-secondary">
          {{ academicLabel(student.program, locale) || '-' }}
        </td>
        <td class="px-3 py-3 font-sans text-sm text-text-secondary">
          {{ student.enrollmentYear ?? '-' }}
        </td>
        <td class="px-3 py-3 font-sans text-sm text-text-secondary">
          <span class="block">{{ t(`students.location.${student.locationStatus}`) }}</span>
          <span v-if="student.drawer" class="text-xs text-text-muted">
            {{ drawerLabel(student.drawer) }}
          </span>
        </td>
        <td class="px-3 py-3">
          <StudentStatusBadge :status="student.studentStatus" />
        </td>
        <td class="px-3 py-3 text-end">
          <div v-if="canManage" class="inline-flex items-center gap-1">
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded text-[#4285F4] transition-colors hover:bg-surface"
              :aria-label="t('students.actions.edit')"
              @click="emit('edit', student)"
            >
              <Pencil class="h-4 w-4" />
            </button>
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded text-danger transition-colors hover:bg-surface"
              :aria-label="t('students.actions.delete')"
              @click="emit('delete', student)"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
          <span v-else class="text-xs text-text-muted">—</span>
        </td>
      </tr>
    </template>
  </DataTable>
</template>
