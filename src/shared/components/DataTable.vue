<script setup lang="ts">
defineProps<{
  columns: Array<{ key: string; label: string; align?: 'left' | 'center' | 'right' }>
  loading?: boolean
  variant?: 'default' | 'plain'
}>()
</script>

<template>
  <div class="w-full overflow-x-auto">
    <table class="w-full border-collapse font-sans" :class="{ 'border-t-0': variant === 'plain' }">
      <!-- Header -->
      <thead>
        <tr
          :class="variant === 'plain' ? 'bg-transparent' : 'bg-surface-table border border-border'"
        >
          <th
            v-for="col in columns"
            :key="col.key"
            class="px-3 py-3 font-display"
            :class="{
              'text-left': col.align === 'left' || !col.align,
              'text-center': col.align === 'center',
              'text-right': col.align === 'right',
              'text-sm font-bold text-text-secondary border border-border': variant !== 'plain',
              'text-xs font-semibold text-black border-b border-border bg-white':
                variant === 'plain',
            }"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <!-- Body -->
      <tbody>
        <tr v-if="loading">
          <td :colspan="columns.length" class="py-12 text-center text-text-secondary text-sm">
            Loading…
          </td>
        </tr>
        <slot v-else name="rows">
          <tr>
            <td :colspan="columns.length" class="py-12 text-center text-text-secondary text-sm">
              No data
            </td>
          </tr>
        </slot>
      </tbody>
    </table>
  </div>
</template>
