<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const props = defineProps<{ status: 'Active' | 'Inactive' }>()

const { t } = useI18n()
</script>

<template>
  <span
    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-display font-medium"
    :class="
      status === 'Active' ? 'bg-success-bg text-success-text' : 'bg-inactive-bg text-inactive-text'
    "
  >
    {{ props.status === 'Active' ? t('users.status.active') : t('users.status.inactive') }}
  </span>
</template>
