<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { X } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    size?: 'sm' | 'md' | 'lg'
  }>(),
  { size: 'md' },
)

const emit = defineEmits<{ close: [] }>()

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) emit('close')
}

onMounted(() => document.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="emit('close')"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/40" />

        <!-- Panel -->
        <div
          class="relative bg-surface-card rounded-[10px] shadow-[4px_4px_4px_rgba(0,0,0,0.25)] font-sans flex flex-col"
          :class="{
            'w-full max-w-sm': size === 'sm',
            'w-full max-w-lg': size === 'md',
            'w-full max-w-2xl': size === 'lg',
          }"
          @click.stop
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 v-if="title" class="text-xl font-medium text-text-primary">{{ title }}</h2>
            <slot v-else name="title" />
            <button
              type="button"
              class="w-7 h-7 flex items-center justify-center rounded hover:bg-surface text-text-secondary transition-colors"
              @click="emit('close')"
            >
              <X class="w-6 h-6" />
            </button>
          </div>

          <!-- Body -->
          <div class="px-6 py-5 flex-1 overflow-auto">
            <slot />
          </div>

          <!-- Footer (optional) -->
          <div v-if="$slots.footer" class="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
