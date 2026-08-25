<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowRight, CheckCircle2 } from 'lucide-vue-next'
import { relativeTime } from '@/shared/utils/date'
import { IDENTITY_FIELDS } from '../types'
import type { IdentityDiffEntry, ReviewQueueItem } from '../types'

const props = defineProps<{ item: ReviewQueueItem }>()

const { t, locale } = useI18n()

/**
 * The eval signal this whole screen exists to produce: for a verified row,
 * exactly which fields the human had to correct, and to what.
 */
const entries = computed<IdentityDiffEntry[]>(() => {
  const ai = props.item.structuredData
  const human = props.item.verifiedData
  const fields: IdentityDiffEntry[] = IDENTITY_FIELDS.map((field) => {
    const aiValue = ai?.[field] ?? ''
    const humanValue = human?.[field] ?? ''
    return { field, aiValue, humanValue, changed: aiValue !== humanValue }
  })

  const aiExtra = JSON.stringify(ai?.additionalFields ?? {})
  const humanExtra = JSON.stringify(human?.additionalFields ?? {})
  fields.push({
    field: 'additionalFields',
    aiValue: aiExtra === '{}' ? '' : aiExtra,
    humanValue: humanExtra === '{}' ? '' : humanExtra,
    changed: aiExtra !== humanExtra,
  })

  return fields
})

const changedCount = computed(() => entries.value.filter((entry) => entry.changed).length)
</script>

<template>
  <section
    class="flex flex-col gap-3 rounded-lg border border-success/30 bg-success-bg/60 p-4"
    :aria-label="t('review.diff.title')"
  >
    <header class="flex flex-wrap items-center gap-x-2 gap-y-1">
      <CheckCircle2 class="h-4 w-4 shrink-0 text-success" />
      <h3 class="font-display text-sm font-semibold text-text-primary">
        {{ t('review.diff.title') }}
      </h3>
      <span class="font-sans text-xs text-text-secondary">
        {{
          changedCount === 0
            ? t('review.diff.acceptedAsIs')
            : t('review.diff.correctedCount', changedCount)
        }}
      </span>
      <span
        v-if="item.verifiedBy || item.verifiedAt"
        class="ms-auto font-sans text-xs text-text-secondary"
      >
        {{
          t('review.diff.by', {
            name: item.verifiedBy ?? t('review.diff.unknownUser'),
            when: relativeTime(item.verifiedAt, locale),
          })
        }}
      </span>
    </header>

    <dl v-if="changedCount > 0" class="flex flex-col gap-2">
      <template v-for="entry in entries" :key="entry.field">
        <div v-if="entry.changed" class="flex flex-col gap-1">
          <dt class="font-sans text-xs font-medium text-text-secondary">
            {{ t(`review.fields.${entry.field}`) }}
          </dt>
          <dd class="flex flex-wrap items-center gap-2">
            <span
              class="rounded bg-danger/10 px-2 py-0.5 font-sans text-xs text-danger line-through decoration-danger/50"
            >
              {{ entry.aiValue || t('review.form.blank') }}
            </span>
            <ArrowRight class="h-3 w-3 shrink-0 text-text-muted rtl:rotate-180" />
            <span
              class="rounded bg-success-bg px-2 py-0.5 font-sans text-xs font-medium text-success-text"
            >
              {{ entry.humanValue || t('review.form.blank') }}
            </span>
          </dd>
        </div>
      </template>
    </dl>
  </section>
</template>
