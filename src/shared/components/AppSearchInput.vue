<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search } from 'lucide-vue-next'

/**
 * The outlined search field the list pages use — white, bordered, magnifier
 * inside the leading edge.
 *
 * A deliberately different look from `SearchBar` (the filled pill in the app
 * header and inside cards), but it had been copy-pasted verbatim into five
 * list pages, class string and `border-width: 1.3px` and all, so a design
 * tweak was a five-file edit.
 */
const props = defineProps<{
  modelValue?: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  /** Enter pressed, for hosts that want an explicit submit. */
  submit: [value: string]
}>()

const { t } = useI18n()

const placeholderText = computed(() => props.placeholder ?? t('common.searchPlaceholder'))
</script>

<template>
  <div class="relative flex-1 min-w-[200px]">
    <Search class="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
    <input
      :value="modelValue"
      type="text"
      :placeholder="placeholderText"
      class="w-full h-[42px] ps-9 pe-4 bg-white border border-border-dropdown rounded-lg text-xs font-display font-medium text-text-input placeholder:text-text-muted placeholder:font-display placeholder:font-light focus:outline-none focus:border-primary"
      style="border-width: 1.3px"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @keyup.enter="emit('submit', ($event.target as HTMLInputElement).value)"
    />
  </div>
</template>
