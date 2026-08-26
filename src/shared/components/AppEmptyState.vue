<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Inbox } from 'lucide-vue-next'
import type { Component } from 'vue'

/**
 * `title` falls back to a translated default rather than an English literal —
 * the same treatment `AppErrorState` already had, so a caller that omits it
 * cannot leak English into the Arabic UI.
 */
const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    /** Any lucide icon component. Defaults to an inbox. */
    icon?: Component
    compact?: boolean
  }>(),
  {
    title: undefined,
    description: '',
    icon: undefined,
    compact: false,
  },
)

const { t } = useI18n()

const headline = computed(() => props.title ?? t('common.nothingHere'))
</script>

<template>
  <div
    class="flex flex-col items-center justify-center text-center font-sans"
    :class="compact ? 'gap-2 px-4 py-8' : 'gap-3 px-6 py-14'"
  >
    <div
      class="flex items-center justify-center rounded-full bg-surface text-text-muted"
      :class="compact ? 'h-10 w-10' : 'h-14 w-14'"
    >
      <component :is="icon ?? Inbox" :class="compact ? 'h-5 w-5' : 'h-7 w-7'" />
    </div>
    <p
      class="font-display font-medium text-text-primary"
      :class="compact ? 'text-sm' : 'text-base'"
    >
      {{ headline }}
    </p>
    <p v-if="description" class="max-w-sm text-sm text-text-secondary">{{ description }}</p>
    <div v-if="$slots.action" class="mt-1">
      <slot name="action" />
    </div>
  </div>
</template>
