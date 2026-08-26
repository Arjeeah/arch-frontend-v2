<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Component } from 'vue'
import { readSessionRole } from '../utils/role'

/**
 * The call-to-action at the foot of a dashboard card.
 *
 * These three buttons used to be permanently `disabled` because the screens
 * they point at did not exist. Rather than hard-wiring them live — and shipping
 * a link that lands on the 404 page if a module is not merged yet — the button
 * asks the router whether the path resolves. Unknown paths fall through to the
 * catch-all route (named `not-found`), and the button stays disabled with a
 * tooltip explaining why. Add the route and the button lights up on its own.
 */
const props = withDefaults(
  defineProps<{
    /** Target path, e.g. `/users`. */
    to: string
    label: string
    icon?: Component
    /** Tooltip shown while the target route does not exist. */
    unavailableHint?: string
  }>(),
  { icon: undefined, unavailableHint: undefined },
)

const router = useRouter()

/**
 * Live only when the path resolves to a real route *and* the signed-in role is
 * allowed on it — otherwise the router guard would bounce the click straight
 * back here. `meta.roles` is the same allowlist the guard reads; an absent key
 * means every authenticated role may enter.
 */
const available = computed(() => {
  const resolved = router.resolve(props.to)
  if (resolved.name === 'not-found') return false

  const allowedRoles: readonly string[] | undefined = resolved.meta.roles
  if (!allowedRoles) return true

  const role = readSessionRole()
  return !!role && allowedRoles.includes(role)
})
</script>

<template>
  <RouterLink
    v-if="available"
    :to="to"
    class="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-primary-mid text-white text-sm font-display font-medium hover:opacity-90 transition-opacity"
  >
    <component :is="icon" v-if="icon" class="w-4 h-4" />
    {{ label }}
  </RouterLink>

  <button
    v-else
    type="button"
    disabled
    :title="unavailableHint"
    class="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-primary/40 text-white text-sm font-display font-medium cursor-not-allowed"
  >
    <component :is="icon" v-if="icon" class="w-4 h-4" />
    {{ label }}
  </button>
</template>
