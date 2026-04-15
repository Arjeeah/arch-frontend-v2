<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    currentPage: number
    totalPages: number
    maxVisible?: number
  }>(),
  { maxVisible: 7 },
)

const emit = defineEmits<{ change: [page: number] }>()

const pages = computed(() => {
  const all = Array.from({ length: props.totalPages }, (_, i) => i + 1)
  if (props.totalPages <= props.maxVisible) return all
  // Simple window: show pages around current
  const half = Math.floor(props.maxVisible / 2)
  const start = Math.max(1, props.currentPage - half)
  const end = Math.min(props.totalPages, start + props.maxVisible - 1)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})
</script>

<template>
  <div class="flex items-center gap-3 font-sans">
    <!-- Prev -->
    <button
      :disabled="currentPage <= 1"
      class="w-8 h-8 flex items-center justify-center rounded bg-surface-table border border-border disabled:opacity-40"
      @click="emit('change', currentPage - 1)"
    >
      <ChevronLeft class="w-4 h-4 text-text-secondary" />
    </button>

    <!-- Page numbers -->
    <div class="flex items-center gap-1">
      <button
        v-for="page in pages"
        :key="page"
        class="w-8 h-8 flex items-center justify-center rounded text-sm font-medium transition-colors"
        :class="page === currentPage
          ? 'bg-primary-accent text-white'
          : 'text-text-primary hover:bg-surface'"
        @click="emit('change', page)"
      >
        {{ page }}
      </button>
    </div>

    <!-- Next -->
    <button
      :disabled="currentPage >= totalPages"
      class="w-8 h-8 flex items-center justify-center rounded bg-surface-table border border-border disabled:opacity-40"
      @click="emit('change', currentPage + 1)"
    >
      <ChevronRight class="w-4 h-4 text-text-primary" />
    </button>
  </div>
</template>
