<script setup lang="ts">
import { CircleAlert, CircleCheck, Info, X } from 'lucide-vue-next'
import { useToastHost, useToasts } from '@/shared/composables/useToasts'
import type { ToastVariant } from '@/shared/composables/useToasts'

withDefaults(defineProps<{ closeLabel?: string }>(), { closeLabel: 'Dismiss notification' })

const { dismiss } = useToasts()
// Only the first mounted host renders, so an extra demo host never doubles toasts.
const { isPrimaryHost, toasts } = useToastHost()

const icons: Record<ToastVariant, typeof Info> = {
  success: CircleCheck,
  error: CircleAlert,
  info: Info,
}

const styles: Record<ToastVariant, string> = {
  success: 'bg-success-bg text-success-text border-success/40',
  error: 'bg-danger/10 text-danger border-danger/40',
  info: 'bg-highlight text-primary-dark border-primary/40',
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isPrimaryHost"
      class="fixed top-4 end-4 z-[60] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
      aria-live="polite"
      aria-atomic="false"
    >
      <TransitionGroup
        enter-active-class="motion-safe:transition motion-safe:duration-200 motion-safe:ease-out"
        enter-from-class="opacity-0 motion-safe:translate-y-[-6px]"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="motion-safe:transition motion-safe:duration-150 motion-safe:ease-in absolute w-full"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
        move-class="motion-safe:transition-transform motion-safe:duration-200"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          role="status"
          class="pointer-events-auto flex items-start gap-3 rounded-[10px] border px-4 py-3 font-sans text-sm shadow-[4px_4px_4px_rgba(0,0,0,0.10)]"
          :class="styles[toast.variant]"
        >
          <component :is="icons[toast.variant]" class="mt-0.5 h-4 w-4 shrink-0" />
          <p class="flex-1 text-start leading-5">{{ toast.message }}</p>
          <button
            type="button"
            class="-me-1 flex h-5 w-5 shrink-0 items-center justify-center rounded transition-opacity hover:opacity-70"
            :aria-label="closeLabel"
            @click="dismiss(toast.id)"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
