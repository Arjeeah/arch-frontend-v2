<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  currentPage: number
  totalPages: number
}>()

const emit = defineEmits<{ 'update:currentPage': [page: number] }>()

const visiblePages = computed((): (number | '...')[] => {
  const { currentPage: cur, totalPages: total } = props
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (cur <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (cur >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', cur - 1, cur, cur + 1, '...', total]
})
</script>

<template>
  <div class="flex items-center justify-center gap-1">
    <button
      class="w-8 h-8 flex items-center justify-center rounded border border-border text-text-secondary hover:bg-surface disabled:opacity-40"
      :disabled="currentPage === 1"
      @click="emit('update:currentPage', currentPage - 1)"
    >
      ‹
    </button>

    <template v-for="page in visiblePages" :key="String(page)">
      <span
        v-if="page === '...'"
        class="w-8 h-8 flex items-center justify-center text-text-muted text-sm"
      >
        …
      </span>
      <button
        v-else
        class="w-8 h-8 flex items-center justify-center rounded text-sm font-display font-medium transition-colors"
        :class="
          page === currentPage
            ? 'bg-primary text-white'
            : 'border border-border text-text-secondary hover:bg-surface'
        "
        @click="emit('update:currentPage', Number(page))"
      >
        {{ page }}
      </button>
    </template>

    <button
      class="w-8 h-8 flex items-center justify-center rounded border border-border text-text-secondary hover:bg-surface disabled:opacity-40"
      :disabled="currentPage === totalPages"
      @click="emit('update:currentPage', currentPage + 1)"
    >
      ›
    </button>
  </div>
</template>
