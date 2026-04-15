<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'accent' | 'danger' | 'ghost'
    size?: 'sm' | 'md'
    type?: 'button' | 'submit'
    disabled?: boolean
    loading?: boolean
  }>(),
  {
    variant: 'primary',
    size: 'md',
    type: 'button',
    disabled: false,
    loading: false,
  },
)

defineEmits<{ click: [e: MouseEvent] }>()
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center gap-2 rounded font-sans font-medium transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
    :class="{
      'bg-primary-mid text-white hover:opacity-90': variant === 'primary',
      'bg-primary-accent text-white hover:opacity-90': variant === 'accent',
      'bg-danger text-white hover:opacity-90': variant === 'danger',
      'bg-transparent text-text-secondary hover:bg-surface': variant === 'ghost',
      'h-8 text-xs px-2.5 py-1': size === 'sm',
      'h-9 text-sm px-3 py-1.5': size === 'md',
    }"
    @click="$emit('click', $event)"
  >
    <span
      v-if="loading"
      class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
    />
    <slot />
  </button>
</template>
