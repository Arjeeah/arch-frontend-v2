<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Bell, ChevronDown, LogOut } from 'lucide-vue-next'
import SearchBar from './SearchBar.vue'

const props = defineProps<{
  /** Signed-in user's display name. Passed down from the layout's auth store. */
  userName?: string
}>()

const emit = defineEmits<{
  logout: []
  /**
   * A locale was picked. Persisting it and flipping `<html dir>` happens in the
   * app layer (`setLocale` in `src/app/plugins/i18n.ts`) — shared components
   * may not import from `src/app/`.
   */
  'locale-change': [locale: string]
}>()

const { t, locale } = useI18n()

const localeOptions = [
  { value: 'en', label: 'EN' },
  { value: 'ar', label: 'العربية' },
]

const search = ref('')
const menuOpen = ref(false)

const displayName = computed(() => props.userName?.trim() || t('header.fallbackUser'))
const initial = computed(() => displayName.value.charAt(0).toUpperCase())

function selectLocale(next: string) {
  if (next !== locale.value) emit('locale-change', next)
}

function logout() {
  menuOpen.value = false
  emit('logout')
}
</script>

<template>
  <header class="h-[65px] bg-primary-dark flex items-center px-6">
    <div class="flex items-center justify-between w-full gap-8">
      <!-- Search -->
      <div class="flex-1 max-w-2xl">
        <SearchBar v-model="search" :placeholder="t('header.searchPlaceholder')" />
      </div>

      <!-- Right: language, notifications, profile -->
      <div class="flex items-center gap-4 shrink-0">
        <!-- Language switcher -->
        <div
          class="flex items-center rounded-lg border border-primary-subtle overflow-hidden"
          role="group"
          :aria-label="t('common.language')"
        >
          <button
            v-for="option in localeOptions"
            :key="option.value"
            type="button"
            class="px-2.5 py-1 text-xs font-sans font-medium transition-colors"
            :class="
              locale === option.value
                ? 'bg-white text-primary-dark'
                : 'text-primary-light hover:bg-primary-subtle'
            "
            :aria-pressed="locale === option.value"
            @click="selectLocale(option.value)"
          >
            {{ option.label }}
          </button>
        </div>

        <!-- Notification bell -->
        <div
          class="relative w-8 h-8 bg-white border border-border rounded-lg flex items-center justify-center"
          :title="t('header.notifications')"
        >
          <Bell class="w-4 h-4 text-text-primary" />
          <!-- Red dot -->
          <span class="absolute top-1 end-1 w-2 h-2 bg-danger rounded-full border border-white" />
        </div>

        <!-- Profile -->
        <div class="relative">
          <button
            type="button"
            class="flex items-center gap-2"
            :aria-label="t('header.accountMenu')"
            :aria-expanded="menuOpen"
            @click="menuOpen = !menuOpen"
          >
            <div
              class="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-xs font-bold text-primary-dark shrink-0"
            >
              {{ initial }}
            </div>
            <span class="font-sans text-sm font-medium text-white">{{ displayName }}</span>
            <ChevronDown
              class="w-4 h-4 text-primary-light transition-transform"
              :class="{ 'rotate-180': menuOpen }"
            />
          </button>

          <!-- Click-away backdrop -->
          <div v-if="menuOpen" class="fixed inset-0 z-10" @click="menuOpen = false" />

          <div
            v-if="menuOpen"
            class="absolute end-0 top-full mt-2 z-20 min-w-[160px] bg-surface-card border border-border rounded-lg shadow-lg py-1"
          >
            <button
              type="button"
              class="w-full flex items-center gap-2 px-3 py-2 text-sm font-sans text-text-primary text-start hover:bg-surface transition-colors"
              @click="logout"
            >
              <LogOut class="w-4 h-4" />
              {{ t('common.logout') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
