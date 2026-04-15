<script setup lang="ts">
import { Bell, ChevronDown } from 'lucide-vue-next'
import SearchBar from './SearchBar.vue'
import { ref } from 'vue'

defineProps<{
  userName?: string
}>()

const search = ref('')
</script>

<template>
  <header class="h-[65px] bg-primary-dark flex items-center px-6">
    <div class="flex items-center justify-between w-full gap-8">
      <!-- Search -->
      <div class="flex-1 max-w-2xl">
        <SearchBar v-model="search" placeholder="Search…" />
      </div>

      <!-- Right: notifications + profile -->
      <div class="flex items-center gap-4 shrink-0">
        <!-- Notification bell -->
        <div
          class="relative w-8 h-8 bg-white border border-border rounded-lg flex items-center justify-center"
        >
          <Bell class="w-4 h-4 text-text-primary" />
          <!-- Red dot -->
          <span class="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full border border-white" />
        </div>

        <!-- Profile -->
        <div class="flex items-center gap-2">
          <div
            class="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-xs font-bold text-primary-dark shrink-0"
          >
            {{ userName ? userName.charAt(0).toUpperCase() : 'U' }}
          </div>
          <span class="font-sans text-sm font-medium text-white">{{ userName ?? 'User' }}</span>
          <ChevronDown class="w-4 h-4 text-primary-light" />
        </div>
      </div>
    </div>
  </header>
</template>
