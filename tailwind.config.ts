import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2F6FB2',
          dark: '#30476D',
          mid: '#2F6297',
          light: '#B5D2F7',
          subtle: '#536F8A',
          accent: '#4285F4',
        },
        highlight: '#D1F3F6',
        surface: {
          DEFAULT: '#F9FAFB',
          card: '#FFFFFF',
          input: '#F5F5F5',
          table: '#F9F9F9',
        },
        'text-primary': '#1F2937',
        'text-secondary': '#727272',
        'text-muted': '#B6B6B6',
        'text-placeholder': '#808080',
        border: {
          DEFAULT: '#E4E4E4',
          input: '#ADADAD',
          dropdown: '#B8BBC2',
        },
        success: {
          DEFAULT: '#34A853',
          bg: '#F0FEED',
          text: '#259800',
        },
        warning: '#FBBC05',
        danger: '#D7263D',
        inactive: {
          bg: '#EDEDED',
          text: '#717171',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
        brand: ['Agdasima', 'cursive'],
      },
    },
  },
  plugins: [],
} satisfies Config
