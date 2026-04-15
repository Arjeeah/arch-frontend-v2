<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Eye, EyeOff, AlertCircle } from 'lucide-vue-next'
import FormField from '@/shared/components/FormField.vue'
import FormInput from '@/shared/components/FormInput.vue'
import AppButton from '@/shared/components/AppButton.vue'
import { useAuthStore } from '../store/useAuthStore'
import wallpaper from '@/assets/wallpaper.jpg'

const router = useRouter()
const authStore = useAuthStore()

const credentials = reactive({ email: '', password: '' })
const showPassword = ref(false)
const loginError = ref('')
const fieldErrors = reactive({ email: '', password: '' })

watch(() => authStore.error, err => {
  if (err) {
    loginError.value = err
    authStore.clearError()
  }
})

function validate() {
  fieldErrors.email = ''
  fieldErrors.password = ''
  let ok = true
  if (!credentials.email) {
    fieldErrors.email = 'Email is required'
    ok = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email)) {
    fieldErrors.email = 'Enter a valid email address'
    ok = false
  }
  if (!credentials.password) {
    fieldErrors.password = 'Password is required'
    ok = false
  }
  return ok
}

async function handleLogin() {
  loginError.value = ''
  if (!validate()) return
  const { success } = await authStore.login(credentials)
  if (success) {
    const redirect = (router.currentRoute.value.query.redirect as string) || '/dashboard'
    router.push(redirect)
  }
}
</script>

<template>
  <div class="flex min-h-screen">
    <!-- Left — form panel -->
    <div class="flex flex-col justify-center w-[480px] shrink-0 min-h-screen bg-white px-12 py-16">
      <!-- Logo -->
      <span class="font-brand font-bold text-3xl text-primary-dark leading-none mb-10">
        ARCH system
      </span>

      <!-- Heading -->
      <h1 class="font-sans font-bold text-4xl text-text-primary leading-tight mb-1">
        Welcome back
      </h1>
      <p class="font-sans text-sm text-text-secondary mb-8">
        Sign in to your account to continue
      </p>

      <!-- Error alert -->
      <div
        v-if="loginError"
        class="flex items-start gap-2 bg-danger/10 text-danger rounded-lg px-4 py-3 text-sm font-sans mb-6"
      >
        <AlertCircle class="w-4 h-4 mt-0.5 shrink-0" />
        <span class="flex-1">{{ loginError }}</span>
        <button type="button" class="shrink-0 opacity-60 hover:opacity-100" @click="loginError = ''">
          ✕
        </button>
      </div>

      <!-- Form -->
      <form class="space-y-5" @submit.prevent="handleLogin">
        <!-- Email -->
        <FormField label="Email address" field-id="login-email" :error="fieldErrors.email">
          <FormInput
            id="login-email"
            v-model="credentials.email"
            type="email"
            placeholder="user@limu.edu.ly"
          />
        </FormField>

        <!-- Password -->
        <FormField label="Password" field-id="login-password" :error="fieldErrors.password">
          <div class="relative">
            <input
              id="login-password"
              v-model="credentials.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Enter your password"
              class="w-full bg-surface-card border border-border-input rounded-[9px] px-4 py-3 pr-12 font-sans text-sm text-text-primary placeholder:text-text-placeholder placeholder:font-display placeholder:font-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <button
              type="button"
              class="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
              @click="showPassword = !showPassword"
            >
              <EyeOff v-if="showPassword" class="w-4 h-4" />
              <Eye v-else class="w-4 h-4" />
            </button>
          </div>
        </FormField>

        <!-- Remember me + Forgot password -->
        <div class="flex items-center justify-between pt-1">
          <label class="flex items-center gap-2 text-sm text-text-secondary font-sans cursor-pointer select-none">
            <input type="checkbox" class="rounded border-border accent-primary" />
            Remember me
          </label>
          <a
            href="#"
            class="text-sm font-sans text-primary hover:underline"
            @click.prevent
          >
            Forgot password?
          </a>
        </div>

        <!-- Submit -->
        <div class="pt-2">
          <AppButton
            variant="accent"
            type="submit"
            :loading="authStore.loading"
            class="w-full"
          >
            Sign in
          </AppButton>
        </div>
      </form>
    </div>

    <!-- Right — wallpaper -->
    <div
      class="flex-1 bg-cover bg-center bg-no-repeat"
      :style="{ backgroundImage: `url(${wallpaper})` }"
    />
  </div>
</template>
