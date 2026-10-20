/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          DEFAULT: 'var(--bg-main)',
          deep: 'var(--bg-chat)',
          card: 'var(--card-bg)',
          light: 'var(--bg-panel)',
          indigo: 'var(--bg-chat)',
        },
        accent: {
          emerald: 'var(--accent-color)',
          gold: 'var(--accent-secondary)',
          aquamarine: 'var(--accent-aquamarine)',
        },
        glass: {
          bg: 'var(--glass-bg)',
          'bg-hover': 'var(--glass-bg-hover)',
          'bg-active': 'var(--glass-bg-active)',
          border: 'var(--border-color)',
          'border-focus': 'var(--border-focus)',
        },
        slate: {
          50: 'var(--text-slate-50)',
          100: 'var(--text-slate-100)',
          200: 'var(--text-slate-200)',
          300: 'var(--text-slate-300)',
          400: 'var(--text-slate-400)',
          500: 'var(--text-slate-500)',
          600: 'var(--text-slate-600)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass-sm': '0 4px 12px 0 rgba(0, 0, 0, 0.15)',
        'glass-md': '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
        'glass-lg': '0 12px 48px 0 rgba(0, 0, 0, 0.5)',
      }
    },
  },
  plugins: [],
}

