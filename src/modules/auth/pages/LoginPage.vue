<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Eye, EyeOff } from 'lucide-vue-next'
import { landingFor } from '@/app/router'
import { useAuthStore } from '../store/useAuthStore'
import pattern from '@/assets/login-pattern.png'

const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()

const credentials = reactive({ email: '', password: '' })
const showPassword = ref(false)
const rememberMe = ref(false)
const loginError = ref('')
const fieldErrors = reactive({ email: '', password: '' })

watch(
  () => authStore.error,
  (err) => {
    if (err) {
      loginError.value = err
      authStore.clearError()
    }
  },
)

function validate() {
  fieldErrors.email = ''
  fieldErrors.password = ''
  let ok = true
  if (!credentials.email) {
    fieldErrors.email = t('login.errors.emailRequired')
    ok = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email)) {
    fieldErrors.email = t('login.errors.emailInvalid')
    ok = false
  }
  if (!credentials.password) {
    fieldErrors.password = t('login.errors.passwordRequired')
    ok = false
  }
  return ok
}

async function handleLogin() {
  loginError.value = ''
  if (!validate()) return
  const { success } = await authStore.login(credentials)
  if (success) {
    // `ROLE_LANDING` is the single source of truth for where a role starts —
    // hardcoding `/dashboard` here made `/` and the login flow disagree the
    // moment a role's landing moved.
    const redirect =
      (router.currentRoute.value.query.redirect as string) || landingFor(authStore.role)
    router.push(redirect)
  }
}
</script>

<template>
  <!-- Full screen container with diamond pattern background -->
  <div
    class="relative min-h-screen overflow-hidden bg-white bg-no-repeat bg-cover bg-center"
    :style="{ backgroundImage: `url(${pattern})` }"
  >
    <!-- Curved blue shape — pinned to the right, scales to cover -->
    <svg
      class="absolute top-0 right-0 h-full pointer-events-none"
      style="width: auto; aspect-ratio: 1172 / 800"
      viewBox="0 0 1172 800"
      preserveAspectRatio="xMaxYMid slice"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1723 521.575C1723 910.588 1446.98 1225.94 1106.5 1225.94C766.016 1225.94 0 1449.73 0 1060.72C975 720.558 534.729 -17.0604 1036 -34.4522C1376.29 -46.2586 1723 132.563 1723 521.575Z"
        fill="url(#sideShapeGradient)"
      />
      <defs>
        <linearGradient
          id="sideShapeGradient"
          x1="908.728"
          y1="211.08"
          x2="551.937"
          y2="1103.81"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#2F6FB2" />
          <stop offset="1" stop-color="#142F4C" />
        </linearGradient>
      </defs>
    </svg>

    <!-- Form — positioned exactly per Figma: left 49px, top 64px, width 751px -->
    <form
      class="absolute z-10"
      style="left: 49px; top: 64px; width: 751px"
      @submit.prevent="handleLogin"
    >
      <!-- "Sign in" heading — Poppins 500, 55px -->
      <h1 class="font-display font-medium text-black" style="font-size: 55px; line-height: 82px">
        {{ t('login.title') }}
      </h1>

      <!-- API error banner -->
      <div
        v-if="loginError"
        class="mt-4 bg-danger/10 text-danger rounded-lg px-4 py-3 text-sm font-display flex items-center gap-2"
      >
        <span class="flex-1">{{ loginError }}</span>
        <button
          type="button"
          class="opacity-60 hover:opacity-100"
          :aria-label="t('login.dismissError')"
          @click="loginError = ''"
        >
          ✕
        </button>
      </div>

      <!-- Email field group — top:173 on page, 27px below heading -->
      <div style="margin-top: 27px">
        <p class="font-display font-normal text-black" style="font-size: 22px; line-height: 33px">
          {{ t('login.emailLabel') }}
        </p>
        <p v-if="fieldErrors.email" class="mt-1 text-xs text-danger font-display">
          {{ fieldErrors.email }}
        </p>
        <input
          v-model="credentials.email"
          type="email"
          :placeholder="t('login.emailPlaceholder')"
          class="mt-[10px] w-full bg-white rounded-[9px] px-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          style="
            height: 75px;
            border: 1px solid #adadad;
            font-family: 'Poppins', system-ui, sans-serif;
            font-weight: 300;
            font-size: 14px;
            color: #808080;
          "
        />
      </div>

      <!-- Password field group — top:319 on page, 22px below email -->
      <div style="margin-top: 22px">
        <p class="font-display font-normal text-black" style="font-size: 22px; line-height: 33px">
          {{ t('login.passwordLabel') }}
        </p>
        <p v-if="fieldErrors.password" class="mt-1 text-xs text-danger font-display">
          {{ fieldErrors.password }}
        </p>
        <div class="relative mt-[10px]">
          <input
            v-model="credentials.password"
            :type="showPassword ? 'text' : 'password'"
            :placeholder="t('login.passwordPlaceholder')"
            class="w-full bg-white rounded-[9px] px-4 pe-12 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            style="
              height: 75px;
              border: 1px solid #adadad;
              font-family: 'Poppins', system-ui, sans-serif;
              font-weight: 300;
              font-size: 14px;
              color: #808080;
            "
          />
          <button
            type="button"
            class="absolute end-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
            :aria-label="showPassword ? t('login.hidePassword') : t('login.showPassword')"
            @click="showPassword = !showPassword"
          >
            <EyeOff v-if="showPassword" class="w-5 h-5" />
            <Eye v-else class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Remember me + Forgot Password — top:496, 49px below password -->
      <div class="flex items-center justify-between" style="margin-top: 49px">
        <label class="flex items-center gap-3 cursor-pointer select-none">
          <div
            class="flex items-center justify-center bg-white shrink-0"
            style="width: 30.55px; height: 25.09px; border: 1px solid #000"
          >
            <input v-model="rememberMe" type="checkbox" class="w-4 h-4 accent-[#3974D5]" />
          </div>
          <span
            class="font-display font-medium"
            style="font-size: 14px; line-height: 21px; color: #3974d5"
          >
            {{ t('login.rememberMe') }}
          </span>
        </label>

        <a
          href="#"
          class="font-display font-medium"
          style="font-size: 14px; line-height: 21px; color: #3974d5"
          @click.prevent
        >
          {{ t('login.forgotPassword') }}
        </a>
      </div>

      <!-- Login button — top:593, 64px below remember -->
      <button
        type="submit"
        :disabled="authStore.loading"
        class="flex items-center justify-center gap-2 disabled:opacity-70 transition-opacity"
        style="
          margin-top: 64px;
          width: 100%;
          height: 70.96px;
          background: #3974d5;
          box-shadow: 0px 4px 19px rgba(119, 147, 65, 0.3);
          border-radius: 10px;
          font-family: 'Poppins', system-ui, sans-serif;
          font-weight: 500;
          font-size: 22px;
          line-height: 33px;
          color: #ffffff;
        "
      >
        <span
          v-if="authStore.loading"
          class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
        />
        <span v-else>{{ t('login.submit') }}</span>
      </button>
    </form>
  </div>
</template>
