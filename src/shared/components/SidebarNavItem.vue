<script setup lang="ts">
defineProps<{
  label: string
  active?: boolean
  subActive?: boolean
  indent?: boolean
  hasChevron?: boolean
}>()

defineEmits<{ click: [] }>()
</script>

<template>
  <button
    type="button"
    class="w-full flex items-center gap-4 px-3 py-3 rounded font-sans font-medium text-white transition-colors"
    :class="{
      'bg-primary-light': active,
      'bg-primary-subtle': subActive,
      'ps-8': indent,
    }"
    @click="$emit('click')"
  >
    <!-- Icon slot -->
    <span class="w-5 h-5 shrink-0 flex items-center justify-center">
      <slot name="icon" />
    </span>

    <span class="flex-1 text-start text-base leading-5">{{ label }}</span>

    <!-- Optional chevron for expandable items -->
    <span v-if="hasChevron" class="w-5 h-5 shrink-0 flex items-center justify-center opacity-50">
      <slot name="chevron" />
    </span>
  </button>
</template>
