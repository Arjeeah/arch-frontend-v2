<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CheckCheck, ChevronLeft, ChevronRight, ClipboardCheck, RefreshCw } from 'lucide-vue-next'
import AppButton from '@/shared/components/AppButton.vue'
import AppConfirmDialog from '@/shared/components/AppConfirmDialog.vue'
import AppEmptyState from '@/shared/components/AppEmptyState.vue'
import AppErrorState from '@/shared/components/AppErrorState.vue'
import AppPagination from '@/shared/components/AppPagination.vue'
import AppSelect from '@/shared/components/AppSelect.vue'
import { useServerTable } from '@/shared/composables/useServerTable'
import { useToasts } from '@/shared/composables/useToasts'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import { reviewApi } from '../api/reviewApi'
import ConfidenceMeter from '../components/ConfidenceMeter.vue'
import DocumentPreview from '../components/DocumentPreview.vue'
import RefinementForm from '../components/RefinementForm.vue'
import ReviewQueueList from '../components/ReviewQueueList.vue'
import VerificationDiff from '../components/VerificationDiff.vue'
import { CONFIDENCE_CRITICAL, CONFIDENCE_THRESHOLD, IDENTITY_FIELDS, emptyIdentity } from '../types'
import type { LookupOption, RefinementIdentity, ReviewQueueItem } from '../types'

const { t, locale } = useI18n()
const toasts = useToasts()

/**
 * The queue is server-paginated and ordered worst-confidence-first, so page 1
 * is always the work that matters most.
 */
const { rows, loading, error, page, totalPages, total, isEmpty, setFilters, refresh } =
  useServerTable<ReviewQueueItem>((params) => reviewApi.queue(params), {
    perPage: 15,
    errorFallback: t('review.errors.loadTitle'),
  })

/* ---------------------------------------------------------------- *
 * Selection
 * ---------------------------------------------------------------- */

const selectedId = ref<string | null>(null)

const selectedIndex = computed(() =>
  rows.value.findIndex((row) => row.documentId === selectedId.value),
)

const selected = computed<ReviewQueueItem | null>(() => rows.value[selectedIndex.value] ?? null)

/** Set when advancing off the end of a page, so the next page opens at its top. */
const selectFirstOnLoad = ref(false)

watch(rows, (next) => {
  if (selectFirstOnLoad.value) {
    selectFirstOnLoad.value = false
    selectedId.value = next[0]?.documentId ?? null
    return
  }
  // A refresh or filter change can drop the selected row out of the page.
  if (!next.some((row) => row.documentId === selectedId.value)) {
    selectedId.value = next[0]?.documentId ?? null
  }
})

function select(documentId: string): void {
  selectedId.value = documentId
}

/* ---------------------------------------------------------------- *
 * Preview URL
 * ---------------------------------------------------------------- */

/**
 * The queue row's own `file_url` is a relative, unsigned `/storage/...` path
 * that no `<img>`/`<iframe>` can load (see `api/reviewApi.ts`), so a signed URL
 * is resolved for the *selected* row only — one request per row an operator
 * opens, not one per row on the page. Signed URLs are short-lived, which is a
 * second reason to mint them on selection rather than up front.
 */
const previewUrl = ref<string | null>(null)
const previewResolving = ref(false)
const previewError = ref<string | null>(null)
let previewToken = 0

async function resolvePreview(item: ReviewQueueItem | null): Promise<void> {
  const token = ++previewToken
  previewUrl.value = null
  previewError.value = null

  if (!item?.hasFile) {
    previewResolving.value = false
    return
  }

  previewResolving.value = true
  try {
    const url = await reviewApi.documentFileUrl(item.documentId)
    if (token !== previewToken) return
    previewUrl.value = url
  } catch (err: unknown) {
    if (token !== previewToken) return
    previewError.value = getApiErrorMessage(err, t('review.errors.preview'))
  } finally {
    if (token === previewToken) previewResolving.value = false
  }
}

function step(delta: number): void {
  if (selectedIndex.value < 0) return
  const next = rows.value[selectedIndex.value + delta]
  if (next) selectedId.value = next.documentId
}

/** Move to the next row, rolling onto the next page when this one runs out. */
function advance(): void {
  const next = selectedIndex.value >= 0 ? rows.value[selectedIndex.value + 1] : undefined
  if (next) {
    selectedId.value = next.documentId
    return
  }
  if (page.value < totalPages.value) {
    selectFirstOnLoad.value = true
    page.value += 1
  }
}

/* ---------------------------------------------------------------- *
 * Edit buffer
 * ---------------------------------------------------------------- */

const form = ref<RefinementIdentity>(emptyIdentity())
/** JSON of the buffer as it was loaded — the "has the operator touched it" mark. */
const loadedSnapshot = ref('')
const saving = ref(false)

/**
 * Unsaved corrections, held per row.
 *
 * Selecting another row, paging, changing the filter and Refresh all rebuild
 * `rows`, and the form reloads from whatever the server last said. Without a
 * buffer, one misclick in the rail silently deletes a half-finished
 * correction — on the screen whose entire output *is* those corrections, and
 * with no undo. Drafts are dropped the moment the row is written or the
 * operator explicitly resets it, so nothing stale can be resurrected.
 *
 * Deliberately a plain Map: it is only ever read imperatively from
 * `loadForm`, and `isDirty` already derives from `form` + `loadedSnapshot`.
 */
const drafts = new Map<string, RefinementIdentity>()

/** The best data we have for a row: the human answer if there is one, else the AI's. */
function identityOf(item: ReviewQueueItem | null): RefinementIdentity {
  const source = item?.verifiedData ?? item?.structuredData
  if (!source) return emptyIdentity()
  return {
    studentNumber: source.studentNumber,
    studentName: source.studentName,
    college: source.college,
    program: source.program,
    documentType: source.documentType,
    enrollmentDate: source.enrollmentDate,
    additionalFields: { ...source.additionalFields },
  }
}

function loadForm(item: ReviewQueueItem | null): void {
  const identity = identityOf(item)
  // Always the server's answer, whether or not a draft is restored on top of
  // it — this is what "dirty" and the correction diff are measured against.
  loadedSnapshot.value = JSON.stringify(identity)
  const draft = item ? drafts.get(item.documentId) : undefined
  form.value = draft ?? identity
}

watch(
  selected,
  (item) => {
    loadForm(item)
    void resolvePreview(item)
  },
  { immediate: true },
)

const isDirty = computed(() => JSON.stringify(form.value) !== loadedSnapshot.value)

/**
 * Keep the draft for the row currently on screen in step with the buffer.
 * Every edit path replaces `form.value` wholesale, so a shallow watch is
 * enough. Registered after the `selected` watcher above so that a row switch
 * reloads the form first and this then records against the new row.
 */
watch(form, (value) => {
  const documentId = selectedId.value
  if (!documentId) return
  if (JSON.stringify(value) === loadedSnapshot.value) drafts.delete(documentId)
  else drafts.set(documentId, value)
})

/**
 * What to send to `PATCH /v1/refinements/{id}`.
 *
 * Diffed against `structured_data`, not against the loaded buffer, because the
 * controller merges the payload over `structured_data`. Diffing against the
 * buffer would let a field that was corrected in an earlier pass silently
 * revert to the AI's answer on the next save.
 */
const corrections = computed<Partial<RefinementIdentity>>(() => {
  const base = selected.value?.structuredData ?? null
  const next: Partial<RefinementIdentity> = {}

  for (const field of IDENTITY_FIELDS) {
    const value = form.value[field]
    if ((base?.[field] ?? '') !== value) next[field] = value
  }

  const baseExtra = JSON.stringify(base?.additionalFields ?? {})
  if (baseExtra !== JSON.stringify(form.value.additionalFields)) {
    next.additionalFields = form.value.additionalFields
  }

  return next
})

const correctionCount = computed(() => Object.keys(corrections.value).length)

/** A human has already accepted this row — `verified_at` is stamped. */
const alreadyVerified = computed(() => Boolean(selected.value?.verifiedAt))

/**
 * Whether either write endpoint still has something to say about this row.
 *
 * A row somebody already verified, and that nobody has touched since, is
 * finished. Both endpoints overwrite `verified_by`/`verified_at` unconditionally,
 * so re-sending it would replace the reviewer who actually did the work with
 * whoever happened to page past it — and that attribution is part of the eval
 * record. Ctrl+Enter makes paging past a verified row a single keystroke, so
 * this has to be checked rather than left to the operator.
 */
const hasPendingWork = computed(() => !alreadyVerified.value || isDirty.value)

/**
 * Verify-as-is copies `structured_data` over `verified_data`, so it throws away
 * everything that differs from the AI's answer — unsaved edits and an earlier
 * reviewer's *saved* corrections alike. Both cases get the confirm dialog;
 * keying off `isDirty` alone would let one unprompted click delete the exact
 * ground truth this screen exists to produce.
 */
const verifyWouldDiscard = computed(() => correctionCount.value > 0)

/** Verified, untouched, and identical to the AI answer: no action can change it. */
const isSettled = computed(
  () => alreadyVerified.value && !isDirty.value && correctionCount.value === 0,
)

/**
 * Both write endpoints bind `document_refinements.id`, and
 * `ReviewQueueResource` does not send it (see `api/reviewApi.ts`). Without it
 * there is no id to address, so the actions are disabled and explained rather
 * than firing a request that 404s every time. The moment the resource carries
 * `refinement_id`, this turns true on its own.
 */
const canWrite = computed(() => Boolean(selected.value?.refinementId))

function resetForm(): void {
  // Drop the draft first — `loadForm` would otherwise restore what we are
  // being asked to throw away.
  if (selectedId.value) drafts.delete(selectedId.value)
  loadForm(selected.value)
}

/* ---------------------------------------------------------------- *
 * Mutations
 * ---------------------------------------------------------------- */

function patchRow(documentId: string, patch: Partial<ReviewQueueItem>): void {
  rows.value = rows.value.map((row) => (row.documentId === documentId ? { ...row, ...patch } : row))
}

async function saveCorrections(then: 'stay' | 'advance' = 'stay'): Promise<void> {
  const item = selected.value
  if (!item?.refinementId || saving.value || correctionCount.value === 0 || !hasPendingWork.value)
    return

  // Snapshot before awaiting — the row is patched in place on success, and the
  // count is what the toast reports.
  const payload = corrections.value
  const count = correctionCount.value

  saving.value = true
  try {
    const result = await reviewApi.saveCorrections(item.refinementId, payload)
    // Written: the draft has to go before `patchRow`'s reactivity reaches the
    // `selected` watcher, or `loadForm` restores it and the row reads unsaved.
    drafts.delete(item.documentId)
    patchRow(item.documentId, {
      verifiedData: result.verifiedData,
      verifiedBy: result.verifiedBy,
      verifiedAt: result.verifiedAt,
    })
    loadedSnapshot.value = JSON.stringify(form.value)
    toasts.success(t('review.toasts.saved', count))
    if (then === 'advance') advance()
  } catch (err: unknown) {
    toasts.error(getApiErrorMessage(err, t('review.errors.save')))
  } finally {
    saving.value = false
  }
}

async function verifyAsIs(then: 'stay' | 'advance' = 'stay'): Promise<void> {
  const item = selected.value
  if (!item?.refinementId || saving.value || isSettled.value) return

  saving.value = true
  try {
    const result = await reviewApi.verify(item.refinementId)
    // Verifying as-is is the operator choosing the AI's answer over their own,
    // so the draft is spent — and must not survive into `loadForm` below.
    drafts.delete(item.documentId)
    // The endpoint copies `structured_data` into `verified_data` verbatim.
    patchRow(item.documentId, {
      verifiedData: item.structuredData,
      verifiedBy: result.verifiedBy,
      verifiedAt: result.verifiedAt,
    })
    loadForm({ ...item, verifiedData: item.structuredData })
    toasts.success(t('review.toasts.verified'))
    if (then === 'advance') advance()
  } catch (err: unknown) {
    toasts.error(getApiErrorMessage(err, t('review.errors.verify')))
  } finally {
    saving.value = false
  }
}

/** The throughput action: whichever of the two endpoints this row needs, then next. */
async function commitAndAdvance(): Promise<void> {
  if (!selected.value || saving.value) return
  // Already verified and untouched: there is nothing to write, only somewhere
  // to go. Writing anyway would re-stamp the row with the current reviewer.
  if (!hasPendingWork.value) {
    advance()
    return
  }
  if (!canWrite.value) return
  if (correctionCount.value > 0) {
    await saveCorrections('advance')
    return
  }
  await verifyAsIs('advance')
}

/** Verifying as-is throws corrections away, so ask first when there are any. */
const discardDialogOpen = ref(false)

function requestVerifyAsIs(): void {
  if (verifyWouldDiscard.value) {
    discardDialogOpen.value = true
    return
  }
  void verifyAsIs('stay')
}

function confirmVerifyAsIs(): void {
  discardDialogOpen.value = false
  resetForm()
  void verifyAsIs('stay')
}

/* ---------------------------------------------------------------- *
 * Lookups for the college / document-type selects
 * ---------------------------------------------------------------- */

const faculties = ref<LookupOption[]>([])
const documentTypes = ref<LookupOption[]>([])
const lookupsLoading = ref(false)
const lookupsFailed = ref(false)

async function loadLookups(): Promise<void> {
  lookupsLoading.value = true
  try {
    const [facultyOptions, typeOptions] = await Promise.all([
      reviewApi.listFaculties(locale.value),
      reviewApi.listDocumentTypes(),
    ])
    faculties.value = facultyOptions
    documentTypes.value = typeOptions
    lookupsFailed.value = false
  } catch (err: unknown) {
    lookupsFailed.value = true
    toasts.error(getApiErrorMessage(err, t('review.errors.lookups')))
  } finally {
    lookupsLoading.value = false
  }
}

// Faculty labels follow the interface language, so the lookup is re-read on switch.
watch(locale, () => void loadLookups())

/**
 * Refresh has to cover the lookups, not just the queue.
 *
 * College and document type are *selects*: if their lists failed to load, the
 * operator cannot set either field at all — only the value the extractor
 * happened to produce is on offer. The lookups are otherwise fetched once on
 * mount, so without this the screen stays half-usable for the whole session.
 */
function refreshAll(): void {
  void refresh()
  if (lookupsFailed.value) void loadLookups()
}

/* ---------------------------------------------------------------- *
 * Filter
 * ---------------------------------------------------------------- */

const confidenceFilter = ref('')

const confidenceOptions = computed<LookupOption[]>(() => [
  {
    value: String(CONFIDENCE_CRITICAL),
    label: t('review.filter.below', { value: CONFIDENCE_CRITICAL }),
  },
  {
    value: String(CONFIDENCE_THRESHOLD),
    label: t('review.filter.below', { value: CONFIDENCE_THRESHOLD }),
  },
])

watch(confidenceFilter, (value) => {
  // An empty string would pass `$request->has()` on the backend and cast to 0,
  // hiding every row — so clearing the filter must drop the key entirely.
  setFilters({ below_confidence: value === '' ? undefined : value })
})

/* ---------------------------------------------------------------- *
 * Keyboard — this screen is worked through, not clicked through
 * ---------------------------------------------------------------- */

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

function handleKeydown(event: KeyboardEvent): void {
  const chord = event.metaKey || event.ctrlKey

  if (chord && event.key === 'Enter') {
    event.preventDefault()
    void commitAndAdvance()
    return
  }
  if (chord && event.key.toLowerCase() === 's') {
    event.preventDefault()
    void saveCorrections('stay')
    return
  }
  if (chord || event.altKey || isTypingTarget(event.target)) return

  if (event.key === 'j' || event.key === 'ArrowDown') {
    event.preventDefault()
    step(1)
  } else if (event.key === 'k' || event.key === 'ArrowUp') {
    event.preventDefault()
    step(-1)
  }
}

onMounted(() => {
  void loadLookups()
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))

/* ---------------------------------------------------------------- *
 * Display helpers
 * ---------------------------------------------------------------- */

/**
 * `numberingSystem: 'latn'` is pinned deliberately. The rest of this screen
 * renders numbers straight into the message (`header.position`, the pagination
 * control, the student number itself), which is always Western digits — and
 * CLDR's default numbering system for `ar` has moved between releases. Letting
 * it float means one ICU version renders "١٥ بانتظار المراجعة" beside "3 من 15".
 */
const numberFormat = computed(
  () => new Intl.NumberFormat(locale.value, { numberingSystem: 'latn' }),
)

const pendingLabel = computed(() => numberFormat.value.format(total.value))

const positionLabel = computed(() => {
  if (selectedIndex.value < 0 || rows.value.length === 0) return ''
  return t('review.header.position', {
    index: selectedIndex.value + 1,
    count: rows.value.length,
  })
})
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="font-display text-2xl font-semibold text-text-primary">
          {{ t('review.title') }}
        </h1>
        <p class="mt-0.5 font-sans text-sm text-text-secondary">
          {{ t('review.subtitle') }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <span
          class="rounded-full bg-surface px-3 py-1.5 font-sans text-xs font-medium text-text-secondary tabular-nums"
        >
          {{ t('review.header.pending', { count: pendingLabel }, total) }}
        </span>
        <AppSelect
          v-model="confidenceFilter"
          :options="confidenceOptions"
          :placeholder="t('review.filter.all')"
        />
        <AppButton variant="ghost" size="md" :disabled="loading" @click="refreshAll">
          <RefreshCw class="h-4 w-4" :class="loading ? 'animate-spin' : ''" />
          {{ t('review.actions.refresh') }}
        </AppButton>
      </div>
    </div>

    <!-- Whole-list failure -->
    <AppErrorState
      v-if="error && rows.length === 0"
      :title="t('review.errors.loadTitle')"
      :description="error"
      :retry-label="t('review.actions.retry')"
      @retry="refreshAll"
    />

    <!-- Queue drained -->
    <AppEmptyState
      v-else-if="isEmpty"
      :icon="CheckCheck"
      :title="t('review.empty.title')"
      :description="t('review.empty.description')"
    >
      <template #action>
        <AppButton variant="primary" size="sm" @click="refreshAll">
          <RefreshCw class="h-4 w-4" />
          {{ t('review.actions.refresh') }}
        </AppButton>
      </template>
    </AppEmptyState>

    <!-- Workbench -->
    <div v-else class="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <!-- Queue rail -->
      <aside class="flex flex-col gap-3">
        <div class="overflow-hidden rounded-lg border border-border bg-surface-card">
          <h2
            class="border-b border-border px-4 py-2.5 font-display text-sm font-semibold text-text-primary"
          >
            {{ t('review.list.title') }}
          </h2>
          <ReviewQueueList
            :items="rows"
            :selected-id="selectedId"
            :loading="loading"
            @select="select"
          />
        </div>
        <AppPagination v-if="totalPages > 1" v-model:currentPage="page" :total-pages="totalPages" />
      </aside>

      <!-- Split: document beside the identity it produced -->
      <div class="grid min-w-0 gap-4 xl:grid-cols-2">
        <DocumentPreview
          :item="selected"
          :file-url="previewUrl"
          :resolving="previewResolving"
          :error="previewError"
        />

        <section
          class="flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-surface-card p-4"
          :aria-label="t('review.form.title')"
        >
          <!-- Row header: position, confidence, step controls -->
          <header class="flex flex-col gap-3 border-b border-border pb-4">
            <div class="flex items-center gap-2">
              <h2
                class="min-w-0 flex-1 truncate font-display text-sm font-semibold text-text-primary"
              >
                {{ selected?.fileNumber || t('review.form.title') }}
              </h2>
              <span
                v-if="positionLabel"
                class="shrink-0 font-sans text-xs text-text-secondary tabular-nums"
              >
                {{ positionLabel }}
              </span>
              <button
                type="button"
                class="rounded p-1.5 text-text-secondary transition-colors hover:bg-surface disabled:opacity-40"
                :disabled="selectedIndex <= 0"
                :aria-label="t('review.actions.previous')"
                :title="t('review.actions.previous')"
                @click="step(-1)"
              >
                <ChevronLeft class="h-4 w-4 rtl:rotate-180" />
              </button>
              <button
                type="button"
                class="rounded p-1.5 text-text-secondary transition-colors hover:bg-surface disabled:opacity-40"
                :disabled="selectedIndex < 0 || selectedIndex >= rows.length - 1"
                :aria-label="t('review.actions.next')"
                :title="t('review.actions.next')"
                @click="step(1)"
              >
                <ChevronRight class="h-4 w-4 rtl:rotate-180" />
              </button>
            </div>

            <ConfidenceMeter :score="selected?.confidenceScore ?? null" />

            <div class="flex flex-wrap items-center gap-2">
              <span
                v-if="selected"
                class="rounded-full bg-surface px-2 py-0.5 font-sans text-xs text-text-secondary"
              >
                {{ selected.pipelineStatusLabel }}
              </span>
              <span
                v-if="isDirty"
                class="rounded-full bg-warning/25 px-2 py-0.5 font-sans text-xs font-medium text-text-primary"
              >
                {{ t('review.form.unsaved') }}
              </span>
            </div>
          </header>

          <!-- Already-verified rows keep their AI-vs-human record on screen -->
          <VerificationDiff v-if="selected?.verifiedAt" :item="selected" />

          <RefinementForm
            v-if="selected"
            v-model="form"
            :faculties="faculties"
            :document-types="documentTypes"
            :ai-snapshot="selected.structuredData"
            :disabled="saving"
            :lookups-loading="lookupsLoading"
            :lookups-failed="lookupsFailed"
          />
          <AppEmptyState
            v-else
            compact
            :icon="ClipboardCheck"
            :title="t('review.form.noSelectionTitle')"
            :description="t('review.form.noSelectionDescription')"
          />

          <!-- Actions -->
          <footer v-if="selected" class="flex flex-col gap-3 border-t border-border pt-4">
            <div class="flex flex-wrap items-center gap-2">
              <AppButton
                variant="primary"
                :loading="saving"
                :disabled="hasPendingWork && !canWrite"
                @click="commitAndAdvance"
              >
                <CheckCheck v-if="hasPendingWork" class="h-4 w-4" />
                <ChevronRight v-else class="h-4 w-4 rtl:rotate-180" />
                {{
                  !hasPendingWork
                    ? t('review.actions.next')
                    : correctionCount > 0
                      ? t('review.actions.saveAndNext')
                      : t('review.actions.verifyAndNext')
                }}
              </AppButton>
              <AppButton
                variant="accent"
                :disabled="saving || !canWrite || correctionCount === 0 || !hasPendingWork"
                @click="saveCorrections('stay')"
              >
                {{ t('review.actions.saveCorrections', correctionCount) }}
              </AppButton>
              <AppButton
                variant="ghost"
                :disabled="saving || !canWrite || isSettled"
                @click="requestVerifyAsIs"
              >
                {{ t('review.actions.verifyAsIs') }}
              </AppButton>
              <AppButton variant="ghost" :disabled="saving || !isDirty" @click="resetForm">
                {{ t('review.actions.reset') }}
              </AppButton>
            </div>

            <p v-if="!canWrite" class="font-sans text-xs text-danger">
              {{ t('review.writeUnavailable') }}
            </p>
            <p class="font-sans text-xs text-text-muted">
              {{ t('review.shortcuts.hint') }}
            </p>
          </footer>
        </section>
      </div>
    </div>

    <!-- Verifying as-is discards unsaved edits -->
    <AppConfirmDialog
      :open="discardDialogOpen"
      :title="t('review.discard.title')"
      :message="t('review.discard.message')"
      :confirm-label="t('review.discard.confirm')"
      confirm-class="bg-danger text-white hover:opacity-80"
      @close="discardDialogOpen = false"
      @confirm="confirmVerifyAsIs"
    />
  </div>
</template>
