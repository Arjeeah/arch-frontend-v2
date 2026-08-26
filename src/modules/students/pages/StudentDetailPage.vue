<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, BadgeCheck, Pencil, Trash2 } from 'lucide-vue-next'
import { readSessionRole } from '@/app/config/sessionRole'
import AppButton from '@/shared/components/AppButton.vue'
import AppErrorState from '@/shared/components/AppErrorState.vue'
import AppConfirmDialog from '@/shared/components/AppConfirmDialog.vue'
import { useToasts } from '@/shared/composables/useToasts'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import { formatDate } from '@/shared/utils/date'
import StudentStatusBadge from '../components/StudentStatusBadge.vue'
import StudentFormDialog from '../components/StudentFormDialog.vue'
import StudentDocumentsCard from '../components/StudentDocumentsCard.vue'
import { useStudentsStore } from '../stores/useStudentsStore'
import { academicLabel, drawerLabel, isDraftStudent, type StudentInput } from '../types'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()
const toasts = useToasts()
const store = useStudentsStore()

/**
 * `readSessionRole()` rather than reading `role` off the stored user: the
 * backend's `UserResource` reports Spatie's hierarchical role names as a
 * `roles` **array** — a super admin literally holds all three — so a session
 * persisted in that shape has no scalar `role` at all and every control here
 * would silently disappear. `readSessionRole` accepts both shapes and reduces
 * an array by `AUTH_ROLES` precedence, which is also what the router guard
 * decides on, so a hidden control and a refused navigation cannot disagree.
 */
const role = readSessionRole()
const canManage = computed(() => role === 'super_admin' || role === 'archivist')

const studentId = computed(() => {
  const raw = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id
  return raw ?? null
})

const student = computed(() => store.current)

/**
 * A student the AI created from a scan: everything on screen is a guess until
 * an archivist promotes it.
 */
const isDraft = computed(() => (student.value ? isDraftStudent(student.value) : false))

watch(
  studentId,
  (id) => {
    store.reset()
    if (id) void store.fetchStudent(id)
  },
  { immediate: true },
)

const facts = computed(() => {
  const current = student.value
  if (!current) return []
  return [
    {
      key: 'studentNumber',
      label: t('students.fields.studentNumber'),
      value: current.studentNumber,
    },
    {
      key: 'nationality',
      // Nullable since the draft-student migration — `fromResource` folds a null
      // to `''`, which would render as an empty card rather than a dash. Every
      // other nullable fact on this page already spells its own fallback.
      label: t('students.fields.nationality'),
      value: current.nationality || '—',
    },
    { key: 'email', label: t('students.fields.email'), value: current.email ?? '—' },
    { key: 'phone', label: t('students.fields.phone'), value: current.phone ?? '—' },
    {
      key: 'faculty',
      label: t('students.fields.faculty'),
      value: academicLabel(current.faculty, locale.value) || '—',
    },
    {
      key: 'program',
      label: t('students.fields.program'),
      value: academicLabel(current.program, locale.value) || '—',
    },
    {
      key: 'enrollmentYear',
      label: t('students.fields.enrollmentYear'),
      value: current.enrollmentYear !== null ? String(current.enrollmentYear) : '—',
    },
    {
      key: 'graduationYear',
      label: t('students.fields.graduationYear'),
      value: current.graduationYear !== null ? String(current.graduationYear) : '—',
    },
    {
      key: 'locationStatus',
      label: t('students.fields.locationStatus'),
      value: t(`students.location.${current.locationStatus}`),
    },
    {
      key: 'drawer',
      label: t('students.fields.drawer'),
      value: drawerLabel(current.drawer) || '—',
    },
    {
      key: 'createdAt',
      label: t('students.fields.createdAt'),
      value: formatDate(current.createdAt),
    },
  ]
})

// ── Edit ───────────────────────────────────────────────────────────────────
const editOpen = ref(false)

async function handleSave(input: StudentInput): Promise<void> {
  const current = student.value
  if (!current) return
  try {
    await store.update(current.id, input)
    toasts.success(t('students.toasts.updated', { name: input.name }))
    editOpen.value = false
    // `required_document_types` is computed server-side from the student's
    // faculty/program, and `update` does not return it — an edit that moves the
    // student to another program would otherwise leave the checklist showing
    // the old programme's requirements.
    await store.fetchStudent(current.id)
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('students.errors.saveFailed')))
  }
}

// ── Promote draft ──────────────────────────────────────────────────────────
const promoteOpen = ref(false)

async function confirmPromote(): Promise<void> {
  const current = student.value
  if (!current) return
  try {
    await store.promoteToActive(current.id)
    toasts.success(t('students.toasts.promoted', { name: current.name }))
    promoteOpen.value = false
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('students.errors.promoteFailed')))
  }
}

// ── Delete ─────────────────────────────────────────────────────────────────
const deleteOpen = ref(false)

async function confirmDelete(): Promise<void> {
  const current = student.value
  if (!current) return
  try {
    await store.remove(current.id)
    toasts.success(t('students.toasts.deleted', { name: current.name }))
    deleteOpen.value = false
    await router.push('/students')
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('students.errors.deleteFailed')))
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <RouterLink
      to="/students"
      class="inline-flex w-fit items-center gap-2 font-sans text-sm text-text-secondary hover:text-text-primary"
    >
      <ArrowLeft class="h-4 w-4 rtl:rotate-180" />
      {{ t('students.actions.backToList') }}
    </RouterLink>

    <p v-if="store.loading && !student" class="py-16 text-center font-sans text-text-secondary">
      {{ t('students.states.loading') }}
    </p>

    <AppErrorState
      v-else-if="!student"
      :title="t('students.errors.detailFailed')"
      :description="store.error ?? t('students.errors.notFound')"
      :retry-label="t('students.actions.retry')"
      @retry="studentId && store.fetchStudent(studentId)"
    />

    <template v-else>
      <!-- Identity header -->
      <section class="rounded-[10px] bg-primary-dark px-8 py-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0">
            <div class="mb-1 flex flex-wrap items-center gap-3">
              <h1 class="font-display text-xl font-semibold text-white">{{ student.name }}</h1>
              <StudentStatusBadge :status="student.studentStatus" />
            </div>
            <p class="font-sans text-sm text-white/70">
              {{ student.studentNumber }} ·
              {{ academicLabel(student.faculty, locale) || t('students.states.noFaculty') }}
            </p>
          </div>

          <div v-if="canManage" class="flex flex-wrap items-center gap-2">
            <AppButton v-if="isDraft" variant="accent" size="sm" @click="promoteOpen = true">
              <BadgeCheck class="h-4 w-4" />
              {{ t('students.actions.promote') }}
            </AppButton>
            <AppButton variant="primary" size="sm" @click="editOpen = true">
              <Pencil class="h-4 w-4" />
              {{ t('students.actions.edit') }}
            </AppButton>
            <AppButton variant="danger" size="sm" @click="deleteOpen = true">
              <Trash2 class="h-4 w-4" />
              {{ t('students.actions.delete') }}
            </AppButton>
          </div>
        </div>
      </section>

      <!-- Draft banner -->
      <p
        v-if="isDraft"
        class="rounded-[10px] border border-warning/40 bg-warning/10 px-4 py-3 font-sans text-sm text-text-primary"
      >
        {{ t('students.draftNotice') }}
      </p>

      <!-- Identity facts -->
      <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div
          v-for="fact in facts"
          :key="fact.key"
          class="rounded-[10px] border border-border bg-surface-card p-5 shadow-sm"
        >
          <p class="mb-1 font-display text-xs text-text-muted">{{ fact.label }}</p>
          <p class="break-words font-display text-base font-semibold text-text-primary">
            {{ fact.value }}
          </p>
        </div>
      </section>

      <StudentDocumentsCard
        :student-id="student.id"
        :documents="student.documents"
        :required-document-types="store.requiredDocumentTypes"
        :can-manage="canManage"
      />
    </template>
  </div>

  <StudentFormDialog
    :open="editOpen"
    :student="student"
    :saving="store.saving"
    @close="editOpen = false"
    @save="handleSave"
  />

  <AppConfirmDialog
    :open="promoteOpen"
    :title="t('students.promoteDialog.title')"
    :confirm-label="t('students.actions.promote')"
    @close="promoteOpen = false"
    @confirm="confirmPromote"
  >
    <p class="font-sans text-sm text-text-secondary">
      {{ t('students.promoteDialog.message', { name: student?.name ?? '' }) }}
    </p>
  </AppConfirmDialog>

  <AppConfirmDialog
    :open="deleteOpen"
    :title="t('students.deleteDialog.title')"
    :confirm-label="t('students.actions.delete')"
    confirm-class="bg-danger text-white hover:opacity-80"
    @close="deleteOpen = false"
    @confirm="confirmDelete"
  >
    <p class="font-sans text-sm text-text-secondary">
      {{ t('students.deleteDialog.message', { name: student?.name ?? '' }) }}
    </p>
  </AppConfirmDialog>
</template>
