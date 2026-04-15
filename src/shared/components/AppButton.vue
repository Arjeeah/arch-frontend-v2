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
      'bg-primary-mid text-white hover:opacity-90 px-3 py-1.5 text-sm': variant === 'primary',
      'bg-primary-accent text-white hover:opacity-90 px-3 py-1.5 text-sm': variant === 'accent',
      'bg-danger text-white hover:opacity-90 px-3 py-1.5 text-sm': variant === 'danger',
      'bg-transparent text-text-secondary hover:bg-surface px-3 py-1.5 text-sm': variant === 'ghost',
      'h-8 text-xs px-2.5': size === 'sm',
      'h-9 text-sm px-3': size === 'md',
    }"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
    <slot />
  </button>
</template>
