<script setup lang="ts">
defineProps<{
  label?: string
  fieldId?: string
  error?: string
}>()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label
      v-if="label"
      :for="fieldId"
      class="font-sans text-base font-medium text-text-primary"
    >
      {{ label }}
    </label>
    <slot />
    <p v-if="error" class="text-xs text-danger font-sans">{{ error }}</p>
  </div>
</template>
