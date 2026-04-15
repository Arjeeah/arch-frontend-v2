<script setup lang="ts">
import { ShieldCheck, Check, AlertTriangle, X } from 'lucide-vue-next'
import type { Permission } from '../types'

defineProps<{ permissions: Permission[] }>()
</script>

<template>
  <div class="bg-white rounded-[10px] border border-border p-5 shadow-sm">
    <h3 class="flex items-center gap-2 text-sm font-display font-medium text-primary mb-4">
      <ShieldCheck class="w-4 h-4" />
      Permission Based On Role
    </h3>

    <div class="grid grid-cols-2 gap-2">
      <div
        v-for="(perm, i) in permissions"
        :key="i"
        class="flex items-center gap-2 px-3 py-2 rounded text-sm font-sans"
        :class="{
          'bg-success-bg text-success-text': perm.state === 'allowed',
          'bg-warning/10 text-warning': perm.state === 'warning',
          'bg-surface text-text-muted': perm.state === 'denied',
        }"
      >
        <Check v-if="perm.state === 'allowed'" class="w-4 h-4 shrink-0" />
        <AlertTriangle v-else-if="perm.state === 'warning'" class="w-4 h-4 shrink-0" />
        <X v-else class="w-4 h-4 shrink-0" />
        <span>{{ perm.label }}</span>
      </div>
    </div>

    <!-- Legend -->
    <div class="flex items-center gap-4 mt-4 text-xs text-text-muted font-sans">
      <span class="flex items-center gap-1">
        <span class="w-3 h-3 rounded-sm bg-success-bg inline-block" />
        Allowed
      </span>
      <span class="flex items-center gap-1">
        <span class="w-3 h-3 rounded-sm bg-warning/10 inline-block" />
        With warning
      </span>
      <span class="flex items-center gap-1">
        <span class="w-3 h-3 rounded-sm bg-surface inline-block" />
        Denied
      </span>
    </div>
  </div>
</template>
