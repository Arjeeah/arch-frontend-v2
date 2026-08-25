<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowRight, ChevronDown, FileStack, GraduationCap, Hash, User } from 'lucide-vue-next'
import SearchResultCard from './SearchResultCard.vue'
import { documentPath, studentPath } from '../utils/resultLinks'
import type { SearchMode, SearchResultGroup } from '../types'

/**
 * Every hit that belongs to one document, under one header.
 *
 * The header is the link out: to the student when the pipeline has attached one,
 * otherwise to the document itself — an unattached document is exactly the case
 * an archivist needs to go fix.
 */
const props = defineProps<{
  group: SearchResultGroup
  mode: SearchMode
  maxScore: number
  query: string
}>()

const { t } = useI18n()

/** Pages shown before the "show all" toggle appears. */
const COLLAPSED_HITS = 3

const expanded = ref(false)

const visibleHits = computed(() =>
  expanded.value ? props.group.hits : props.group.hits.slice(0, COLLAPSED_HITS),
)

const hiddenCount = computed(() => Math.max(0, props.group.hits.length - COLLAPSED_HITS))

const target = computed(() =>
  props.group.studentId !== null
    ? studentPath(props.group.studentId)
    : documentPath(props.group.studentDocumentId),
)

const linkLabel = computed(() =>
  props.group.studentId !== null
    ? t('search.results.openStudent')
    : t('search.results.openDocument'),
)

const title = computed(() => props.group.studentName ?? t('search.results.unassigned'))
</script>

<template>
  <article class="overflow-hidden rounded-xl border border-border bg-surface-card">
    <RouterLink
      :to="target"
      class="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-surface p-4 transition-colors hover:bg-surface-input"
    >
      <div class="flex min-w-0 items-start gap-3">
        <span
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <component :is="props.group.studentId !== null ? User : FileStack" class="h-4 w-4" />
        </span>

        <div class="min-w-0">
          <p class="truncate font-display text-sm font-semibold text-text-primary" dir="auto">
            {{ title }}
          </p>

          <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span
              v-if="props.group.studentNumber"
              class="inline-flex items-center gap-1 font-sans text-xs text-text-secondary"
            >
              <Hash class="h-3 w-3" />{{ props.group.studentNumber }}
            </span>
            <span
              v-if="props.group.facultyName"
              class="inline-flex items-center gap-1 font-sans text-xs text-text-secondary"
              dir="auto"
            >
              <GraduationCap class="h-3 w-3" />{{ props.group.facultyName }}
            </span>
            <span
              v-if="props.group.programName"
              class="font-sans text-xs text-text-secondary"
              dir="auto"
            >
              {{ props.group.programName }}
            </span>
            <span v-if="props.group.fileNumber" class="font-sans text-xs text-text-muted">
              {{ t('search.results.fileNumber', { number: props.group.fileNumber }) }}
            </span>
          </div>
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-3">
        <span class="font-sans text-xs text-text-secondary">
          {{ t('search.results.matchingPages', { count: props.group.hits.length }) }}
        </span>
        <span class="inline-flex items-center gap-1 font-sans text-xs font-medium text-primary">
          {{ linkLabel }}
          <ArrowRight class="h-3.5 w-3.5 rtl:rotate-180" />
        </span>
      </div>
    </RouterLink>

    <ul class="flex flex-col gap-2 p-4">
      <SearchResultCard
        v-for="hit in visibleHits"
        :key="hit.contentId"
        :result="hit"
        :mode="props.mode"
        :max-score="props.maxScore"
        :query="props.query"
      />
    </ul>

    <button
      v-if="hiddenCount > 0"
      type="button"
      class="flex w-full items-center justify-center gap-1.5 border-t border-border px-4 py-2 font-sans text-xs font-medium text-primary hover:bg-surface"
      @click="expanded = !expanded"
    >
      {{
        expanded
          ? t('search.results.showLess')
          : t('search.results.showMore', { count: hiddenCount })
      }}
      <ChevronDown class="h-3.5 w-3.5 transition-transform" :class="{ 'rotate-180': expanded }" />
    </button>
  </article>
</template>
