<script setup lang="ts">
import { useI18n } from 'vue-i18n'

/**
 * `align` is logical, not physical. `'left'` / `'right'` are kept as aliases of
 * `'start'` / `'end'` so existing column definitions keep working, but all four
 * emit `text-start` / `text-end`: the header used to be pinned with physical
 * `text-left` while the body cells modules render use logical utilities, so
 * under `dir="rtl"` every header sat on the opposite side from its column.
 */
defineProps<{
  columns: Array<{
    key: string
    label: string
    align?: 'left' | 'start' | 'center' | 'right' | 'end'
  }>
  loading?: boolean
  variant?: 'default' | 'plain'
}>()

const { t } = useI18n()
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
              'text-start': col.align === 'left' || col.align === 'start' || !col.align,
              'text-center': col.align === 'center',
              'text-end': col.align === 'right' || col.align === 'end',
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
            {{ t('common.loading') }}
          </td>
        </tr>
        <slot v-else name="rows">
          <tr>
            <td :colspan="columns.length" class="py-12 text-center text-text-secondary text-sm">
              {{ t('common.noData') }}
            </td>
          </tr>
        </slot>
      </tbody>
    </table>
  </div>
</template>
