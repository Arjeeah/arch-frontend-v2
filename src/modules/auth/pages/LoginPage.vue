<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Eye, EyeOff } from 'lucide-vue-next'
import { useAuthStore } from '../store/useAuthStore'

const router = useRouter()
const authStore = useAuthStore()

const credentials = reactive({ email: '', password: '' })
const showPassword = ref(false)
const rememberMe = ref(false)
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
  <!-- Full screen container -->
  <div class="relative min-h-screen bg-white overflow-hidden">

    <!-- Blue gradient shape — covers from 268px to right edge -->
    <div
      class="absolute top-0 bottom-0 right-0"
      style="left: 268px; background: linear-gradient(207.46deg, #2F6FB2 28.38%, #142F4C 79.8%);"
    />

    <!-- Form — positioned exactly per Figma: left 49px, top 64px, width 751px -->
    <form
      class="absolute z-10"
      style="left: 49px; top: 64px; width: 751px;"
      @submit.prevent="handleLogin"
    >
      <!-- "Sign in" heading — Poppins 500, 55px -->
      <h1
        class="font-display font-medium text-black"
        style="font-size: 55px; line-height: 82px;"
      >
        Sign in
      </h1>

      <!-- API error banner -->
      <div
        v-if="loginError"
        class="mt-4 bg-danger/10 text-danger rounded-lg px-4 py-3 text-sm font-display flex items-center gap-2"
      >
        <span class="flex-1">{{ loginError }}</span>
        <button type="button" class="opacity-60 hover:opacity-100" @click="loginError = ''">✕</button>
      </div>

      <!-- Email field group — top:173, so margin-top from heading bottom (146px): 27px -->
      <div style="margin-top: 27px;">
        <!-- Label — Poppins 400, 22px -->
        <p
          class="font-display font-normal text-black"
          style="font-size: 22px; line-height: 33px;"
        >
          Enter your email address
        </p>
        <!-- Inline validation error -->
        <p v-if="fieldErrors.email" class="mt-1 text-xs text-danger font-display">
          {{ fieldErrors.email }}
        </p>
        <!-- Input — white bg, #ADADAD border, 9px radius, ~75px height -->
        <input
          v-model="credentials.email"
          type="email"
          placeholder="email address"
          class="mt-[10px] w-full bg-white rounded-[9px] px-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          style="
            height: 75px;
            border: 1px solid #ADADAD;
            font-family: 'Poppins', system-ui, sans-serif;
            font-weight: 300;
            font-size: 14px;
            color: #808080;
          "
        />
      </div>

      <!-- Password field group — top:319 from page. Email ends at 297, gap: 22px -->
      <div style="margin-top: 22px;">
        <p
          class="font-display font-normal text-black"
          style="font-size: 22px; line-height: 33px;"
        >
          Enter your Password
        </p>
        <p v-if="fieldErrors.password" class="mt-1 text-xs text-danger font-display">
          {{ fieldErrors.password }}
        </p>
        <div class="relative mt-[10px]">
          <input
            v-model="credentials.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Password"
            class="w-full bg-white rounded-[9px] px-4 pr-12 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            style="
              height: 75px;
              border: 1px solid #ADADAD;
              font-family: 'Poppins', system-ui, sans-serif;
              font-weight: 300;
              font-size: 14px;
              color: #808080;
            "
          />
          <button
            type="button"
            class="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
            @click="showPassword = !showPassword"
          >
            <EyeOff v-if="showPassword" class="w-5 h-5" />
            <Eye v-else class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Remember me + Forgot Password — top:496. Password ends at ~447, gap: 49px -->
      <div class="flex items-center justify-between" style="margin-top: 49px;">
        <!-- Remember me checkbox -->
        <label class="flex items-center gap-3 cursor-pointer select-none">
          <div
            class="flex items-center justify-center bg-white shrink-0"
            style="width: 30.55px; height: 25.09px; border: 1px solid #000;"
          >
            <input
              v-model="rememberMe"
              type="checkbox"
              class="w-4 h-4 accent-[#3974D5]"
            />
          </div>
          <span
            class="font-display font-medium"
            style="font-size: 14px; line-height: 21px; color: #3974D5;"
          >
            Remember me
          </span>
        </label>

        <!-- Forgot Password -->
        <a
          href="#"
          class="font-display font-medium"
          style="font-size: 14px; line-height: 21px; color: #3974D5;"
          @click.prevent
        >
          Forgot Password
        </a>
      </div>

      <!-- Login button — top:593. Remember ends at ~529, gap: 64px -->
      <button
        type="submit"
        :disabled="authStore.loading"
        class="flex items-center justify-center gap-2 disabled:opacity-70 transition-opacity"
        style="
          margin-top: 64px;
          width: 100%;
          height: 70.96px;
          background: #3974D5;
          box-shadow: 0px 4px 19px rgba(119, 147, 65, 0.3);
          border-radius: 10px;
          font-family: 'Poppins', system-ui, sans-serif;
          font-weight: 500;
          font-size: 22px;
          line-height: 33px;
          color: #FFFFFF;
        "
      >
        <span
          v-if="authStore.loading"
          class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
        />
        <span v-else>Log in</span>
      </button>
    </form>
  </div>
</template>
