<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { FileText, Trash2 } from 'lucide-vue-next'
import DataTable from '@/shared/components/DataTable.vue'
import { formatDate } from '@/shared/utils/date'
import type { StudentDocument } from '../types'

defineProps<{
  documents: StudentDocument[]
  loading?: boolean
}>()

const emit = defineEmits<{ delete: [document: StudentDocument] }>()

const { t } = useI18n()

const columns = computed(() => [
  { key: 'fileNumber', label: t('studentDocuments.columns.fileNumber') },
  { key: 'student', label: t('studentDocuments.columns.student') },
  { key: 'type', label: t('studentDocuments.columns.type') },
  { key: 'fileStatus', label: t('studentDocuments.columns.fileStatus') },
  { key: 'submitted', label: t('studentDocuments.columns.submitted') },
  { key: 'file', label: t('studentDocuments.columns.file') },
  { key: 'actions', label: t('studentDocuments.columns.actions'), align: 'right' as const },
])
</script>

<template>
  <DataTable :columns="columns" :loading="loading">
    <template #rows>
      <tr
        v-for="document in documents"
        :key="document.id"
        class="border-t border-border hover:bg-surface"
      >
        <td class="px-3 py-3 font-sans text-sm">
          <RouterLink
            :to="`/student-documents/${document.id}`"
            class="font-medium text-primary hover:underline"
          >
            {{ document.fileNumber || t('studentDocuments.untitled') }}
          </RouterLink>
        </td>
        <td class="px-3 py-3 font-sans text-sm text-text-secondary">
          <RouterLink
            v-if="document.student"
            :to="`/students/${document.student.id}`"
            class="hover:underline"
          >
            {{ document.student.name }}
            <span class="text-text-muted">· {{ document.student.studentNumber }}</span>
          </RouterLink>
          <span v-else>—</span>
        </td>
        <td class="px-3 py-3 font-sans text-sm text-text-secondary">
          {{ document.documentType?.name ?? '—' }}
        </td>
        <td class="px-3 py-3 font-sans text-sm text-text-secondary">
          {{ t(`studentDocuments.fileStatus.${document.fileStatus}`) }}
        </td>
        <td class="px-3 py-3 font-sans text-sm text-text-secondary">
          {{ formatDate(document.submittedAt ?? document.createdAt) }}
        </td>
        <td class="px-3 py-3 font-sans text-sm">
          <a
            v-if="document.fileUrl"
            :href="document.fileUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <FileText class="h-4 w-4" />
            {{ document.fileName || t('studentDocuments.actions.openFile') }}
          </a>
          <span v-else class="text-xs text-text-muted">
            {{ t('studentDocuments.noFile') }}
          </span>
        </td>
        <td class="px-3 py-3 text-end">
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded text-danger transition-colors hover:bg-surface"
            :aria-label="t('studentDocuments.actions.delete')"
            @click="emit('delete', document)"
          >
            <Trash2 class="h-4 w-4" />
          </button>
        </td>
      </tr>
    </template>
  </DataTable>
</template>
