import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#D239F8',
          gold: '#C8A848',
          'dark-gold': '#634D0B',
          cream: '#FFFACD',
          ink: '#1A0A24',
          plum: '#5D2B7A',
          lavender: '#D9B3FF',
        },
      },
      textColor: {
        DEFAULT: 'white',
      },
      borderRadius: {
        '2xl': '1rem',
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        tokyo: ['TokyoDreams', 'serif'],
        baskerville: ['var(--font-libre-baskerville)', 'serif'],
      },
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          sm: '2rem',
          lg: '4rem',
          xl: '5rem',
          '2xl': '6rem',
        },
      },
    },
  },
  plugins: [],
}

export default config
