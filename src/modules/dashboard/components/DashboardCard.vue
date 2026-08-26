<script setup lang="ts">
import AppEmptyState from '@/shared/components/AppEmptyState.vue'
import AppErrorState from '@/shared/components/AppErrorState.vue'

/**
 * The shell every dashboard panel sits in: title bar, then exactly one of
 * loading / error / empty / content. Each panel owns its own request state
 * (see `useAsyncResource`), so this component is what turns that state into
 * the three placeholder screens every list on the dashboard needs.
 */
withDefaults(
  defineProps<{
    title: string
    loading?: boolean
    /** Message from the failed request; renders the retry state when set. */
    error?: string | null
    /** True when the request succeeded but returned nothing to show. */
    empty?: boolean
    emptyTitle?: string
    emptyDescription?: string
    errorTitle?: string
    retryLabel?: string
    /** Drop the body padding — tables bring their own. */
    flush?: boolean
    /** Skeleton rows to show while loading. */
    skeletonRows?: number
  }>(),
  {
    loading: false,
    error: null,
    empty: false,
    emptyTitle: undefined,
    emptyDescription: undefined,
    errorTitle: undefined,
    retryLabel: undefined,
    flush: false,
    skeletonRows: 3,
  },
)

defineEmits<{ retry: [] }>()
</script>

<template>
  <section class="bg-white rounded-[10px] border border-border shadow-sm flex flex-col min-w-0">
    <header
      class="flex items-center justify-between gap-3 px-5 py-4"
      :class="flush ? 'border-b border-border' : ''"
    >
      <h3 class="text-sm font-display font-medium text-text-primary">{{ title }}</h3>
      <slot name="actions" />
    </header>

    <div class="flex flex-col flex-1 min-w-0" :class="flush ? '' : 'px-5 pb-5'">
      <div v-if="loading" class="flex flex-col gap-3 py-2" :class="flush ? 'px-5' : ''">
        <div
          v-for="row in skeletonRows"
          :key="row"
          class="h-4 rounded bg-surface animate-pulse"
          :style="{ width: `${100 - row * 8}%` }"
        />
      </div>

      <!-- With a custom title the raw API message drops to the description, so
           the operator still sees exactly what the server said. -->
      <AppErrorState
        v-else-if="error"
        compact
        :title="errorTitle ?? error"
        :description="errorTitle ? error : ''"
        :retry-label="retryLabel"
        @retry="$emit('retry')"
      />

      <AppEmptyState
        v-else-if="empty"
        compact
        :title="emptyTitle"
        :description="emptyDescription"
      />

      <slot v-else />
    </div>

    <footer v-if="$slots.footer" class="px-5 pb-5 mt-auto">
      <slot name="footer" />
    </footer>
  </section>
</template>
