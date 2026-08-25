<script setup lang="ts">
import { RefreshCw, TriangleAlert } from 'lucide-vue-next'
import type { Component } from 'vue'
import AppButton from '@/shared/components/AppButton.vue'

withDefaults(
  defineProps<{
    title?: string
    description?: string
    /** Any lucide icon component. Defaults to a warning triangle. */
    icon?: Component
    retryLabel?: string
    /** Hide the built-in retry button (e.g. when using the `action` slot instead). */
    retryable?: boolean
    compact?: boolean
  }>(),
  {
    title: 'Something went wrong',
    description: '',
    icon: undefined,
    retryLabel: 'Try again',
    retryable: true,
    compact: false,
  },
)

const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <div
    class="flex flex-col items-center justify-center text-center font-sans"
    :class="compact ? 'gap-2 px-4 py-8' : 'gap-3 px-6 py-14'"
  >
    <div
      class="flex items-center justify-center rounded-full bg-danger/10 text-danger"
      :class="compact ? 'h-10 w-10' : 'h-14 w-14'"
    >
      <component :is="icon ?? TriangleAlert" :class="compact ? 'h-5 w-5' : 'h-7 w-7'" />
    </div>
    <p
      class="font-display font-medium text-text-primary"
      :class="compact ? 'text-sm' : 'text-base'"
    >
      {{ title }}
    </p>
    <p v-if="description" class="max-w-sm text-sm text-text-secondary">{{ description }}</p>
    <div v-if="$slots.action || retryable" class="mt-1">
      <slot name="action">
        <AppButton variant="primary" size="sm" @click="emit('retry')">
          <RefreshCw class="h-4 w-4" />
          {{ retryLabel }}
        </AppButton>
      </slot>
    </div>
  </div>
</template>
