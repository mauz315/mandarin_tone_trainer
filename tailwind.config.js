import forms from '@tailwindcss/forms'
import containerQueries from '@tailwindcss/container-queries'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./audio_library_v2.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        'canvas-navy': '#202A36',
        'canvas-acid': '#B8F526',
        'canvas-ice': '#B4D7E8',
        'canvas-graphite': '#282A2E',
        'canvas-lavender': '#9CA4FC',
        'canvas-butter': '#FDF197',
        'canvas-pink': '#FF8DB8',
        'canvas-mint': '#8EF48A',
        'canvas-celadon': '#064E3B',
        'canvas-builder': '#F0FDF4',
        'canvas-calligraphy': '#F5F3FF',
        'horizon-forest': '#0C3B20',
        'horizon-violet': '#5F3993',
        'badge-pink': '#FF4092',
        'badge-tangerine': '#FF5C1C',
        'badge-red': '#E52421',
        'badge-butter': '#FDF197',
        'badge-cobalt': '#104FE2',
        'badge-lavender': '#9CA4FC',
        "on-tertiary": "#ffffff",
        "secondary-container": "#6c98ff",
        "on-secondary-container": "#002f76",
        "inverse-surface": "#2a322b",
        "tertiary-fixed-dim": "#f5bf22",
        "error": "#ba1a1a",
        "surface-container": "#e7f0e5",
        "surface-container-high": "#e2ebdf",
        "surface-container-highest": "#dce5d9",
        "error-container": "#ffdad6",
        "on-primary-fixed-variant": "#92001d",
        "on-tertiary-fixed-variant": "#5a4300",
        "outline-variant": "#e4bebc",
        "surface-tint": "#bb142c",
        "on-secondary-fixed": "#001946",
        "on-surface-variant": "#5b403f",
        "tertiary-container": "#745800",
        "on-tertiary-fixed": "#251a00",
        "on-error-container": "#93000a",
        "on-error": "#ffffff",
        "on-tertiary-container": "#ffcf55",
        "tertiary": "#574100",
        "inverse-primary": "#ffb3b1",
        "surface": "#f3fcf0",
        "secondary-fixed": "#dae2ff",
        "secondary-fixed-dim": "#b1c5ff",
        "on-secondary-fixed-variant": "#00419e",
        "primary": "#8e001b",
        "tertiary-fixed": "#ffdf98",
        "on-secondary": "#ffffff",
        "primary-container": "#b7102a",
        "background": "#f3fcf0",
        "inverse-on-surface": "#eaf3e7",
        "surface-container-lowest": "#ffffff",
        "surface-dim": "#d4ddd1",
        "on-primary-container": "#ffc7c5",
        "outline": "#8f6f6e",
        "on-primary-fixed": "#410007",
        "on-background": "#161d16",
        "on-primary": "#ffffff",
        "surface-variant": "#dce5d9",
        "surface-container-low": "#edf6ea",
        "surface-bright": "#f3fcf0",
        "primary-fixed-dim": "#ffb3b1",
        "on-surface": "#161d16",
        "primary-fixed": "#ffdad8",
        "secondary": "#2559bd"
      },
      fontFamily: {
        speed: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"Space Mono"', 'monospace'],
        editorial: ['"Playfair Display"', 'serif'],
        bubble: ['"Fredoka"', 'sans-serif'],
        grotesk: ['"Space Grotesk"', 'sans-serif'],
        chinese: ['"Noto Sans SC"', 'sans-serif'],
        headline: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'sans-serif'],
        label: ['"Space Mono"', 'monospace']
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      keyframes: {
        'pop-up': {
          '0%': { transform: 'scale(0.8) translateY(20px)', opacity: '0' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        }
      },
      animation: {
        'pop-up': 'pop-up 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
      }
    },
  },
  plugins: [
    forms,
    containerQueries,
  ],
}
