<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { SearchX, Telescope } from 'lucide-vue-next'
import AppEmptyState from '@/shared/components/AppEmptyState.vue'
import AppErrorState from '@/shared/components/AppErrorState.vue'
import { useToasts } from '@/shared/composables/useToasts'
import { getApiErrorMessage } from '@/shared/utils/apiError'
import SearchForm from '../components/SearchForm.vue'
import SearchFiltersBar from '../components/SearchFiltersBar.vue'
import SearchModeBadge from '../components/SearchModeBadge.vue'
import SearchResultGroupCard from '../components/SearchResultGroupCard.vue'
import { useSearchStore } from '../stores/useSearchStore'
import type { StudentStatus } from '../types'

const { t } = useI18n()
const toasts = useToasts()
const store = useSearchStore()

onMounted(() => {
  void store.loadLookups()
})

/**
 * The query the results on screen belong to — not the box's current contents,
 * which may already have been edited. Snippet highlighting keys off this so it
 * never marks terms the user has not searched for yet.
 */
const submittedQuery = computed(() => store.meta?.query ?? '')

/** Yardstick for the keyword-mode score bars; see `SimilarityBar`. */
const maxScore = computed(() =>
  store.results.reduce((best, result) => Math.max(best, result.similarityScore), 0),
)

async function runSearch(): Promise<void> {
  try {
    await store.search()
  } catch (err) {
    toasts.error(getApiErrorMessage(err, t('search.error.title')))
  }
}

/**
 * Filters re-run the last search on their own: they narrow a result set the
 * user is already looking at, so making them retype nothing and press the
 * button again would be busywork. The query itself still needs an explicit
 * submit — every search costs an embedding call.
 */
async function rerunIfSearched(): Promise<void> {
  if (store.hasSearched && store.isQueryValid) await runSearch()
}

async function onFaculty(facultyId: number | null): Promise<void> {
  await store.setFacultyFilter(facultyId)
  await rerunIfSearched()
}

async function onProgram(programId: number | null): Promise<void> {
  store.setProgramFilter(programId)
  await rerunIfSearched()
}

async function onStatus(status: StudentStatus | null): Promise<void> {
  store.setStatusFilter(status)
  await rerunIfSearched()
}

async function onLimit(limit: number): Promise<void> {
  store.limit = limit
  await rerunIfSearched()
}

async function onResetFilters(): Promise<void> {
  await store.resetFilters()
  await rerunIfSearched()
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <header>
      <h1 class="font-display text-2xl font-semibold text-text-primary">{{ t('search.title') }}</h1>
      <p class="mt-0.5 font-sans text-sm text-text-secondary">{{ t('search.subtitle') }}</p>
    </header>

    <SearchForm
      v-model="store.query"
      :loading="store.loading"
      :valid="store.isQueryValid"
      @submit="runSearch"
      @clear="store.clear"
    />

    <SearchFiltersBar
      :filters="store.filters"
      :limit="store.limit"
      :faculties="store.faculties"
      :programs="store.programs"
      :loading="store.lookupsLoading"
      :error="store.lookupsError"
      @update:faculty="onFaculty"
      @update:program="onProgram"
      @update:status="onStatus"
      @update:limit="onLimit"
      @reset="onResetFilters"
      @retry-lookups="store.loadLookups"
    />

    <!-- Results header: count on one side, which engine answered on the other. -->
    <section v-if="store.meta && !store.loading && !store.error" class="flex flex-col gap-3">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <p class="font-sans text-sm text-text-secondary">
          {{
            t('search.results.summary', {
              results: store.results.length,
              documents: store.groups.length,
            })
          }}
        </p>
        <SearchModeBadge :mode="store.meta.mode" :fallback-reason="store.meta.fallbackReason" />
      </div>
    </section>

    <!-- Loading -->
    <div v-if="store.loading" class="flex flex-col gap-4" aria-busy="true">
      <div
        v-for="skeleton in 3"
        :key="skeleton"
        class="animate-pulse rounded-xl border border-border bg-surface-card"
      >
        <div class="flex items-center gap-3 border-b border-border bg-surface p-4">
          <div class="h-9 w-9 rounded-full bg-surface-input" />
          <div class="flex flex-col gap-2">
            <div class="h-3 w-40 rounded bg-surface-input" />
            <div class="h-2.5 w-64 rounded bg-surface-input" />
          </div>
        </div>
        <div class="flex flex-col gap-2 p-4">
          <div class="h-14 rounded-lg bg-surface-input" />
          <div class="h-14 rounded-lg bg-surface-input" />
        </div>
      </div>
    </div>

    <!-- Failed -->
    <AppErrorState
      v-else-if="store.error"
      :title="t('search.error.title')"
      :description="store.error"
      :retry-label="t('search.error.retry')"
      @retry="runSearch"
    />

    <!-- Searched, nothing matched -->
    <AppEmptyState
      v-else-if="store.isEmpty"
      :icon="SearchX"
      :title="t('search.empty.title')"
      :description="t('search.empty.description', { query: submittedQuery })"
    />

    <!-- Results -->
    <div v-else-if="store.groups.length > 0" class="flex flex-col gap-4">
      <SearchResultGroupCard
        v-for="group in store.groups"
        :key="group.studentDocumentId"
        :group="group"
        :mode="store.meta?.mode ?? 'semantic'"
        :max-score="maxScore"
        :query="submittedQuery"
      />
    </div>

    <!-- Nothing searched yet -->
    <AppEmptyState
      v-else
      :icon="Telescope"
      :title="t('search.idle.title')"
      :description="t('search.idle.description')"
    />
  </div>
</template>
