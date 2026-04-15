import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      // Phase 2 fills in colors, spacing, typography from Figma
    },
  },
  plugins: [],
} satisfies Config

