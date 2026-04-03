import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './emails/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4ff',
          100: '#dce6ff',
          200: '#b9ceff',
          300: '#8aaeff',
          400: '#5580ff',
          500: '#2d5afe',
          600: '#1a3fd4',
          700: '#1430ac',
          800: '#0F172A',
          900: '#0a1020',
          950: '#06091a',
        },
        gold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#F59E0B',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        brand: {
          navy: '#0F172A',
          gold: '#F59E0B',
          'gold-light': '#FCD34D',
          'gold-dark': '#D97706',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-navy': 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)',
        'gradient-gold': 'linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)',
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(15, 23, 42, 0.1), 0 2px 4px -1px rgba(15, 23, 42, 0.06)',
        'card-hover': '0 20px 25px -5px rgba(15, 23, 42, 0.15), 0 10px 10px -5px rgba(15, 23, 42, 0.08)',
        'gold': '0 4px 14px 0 rgba(245, 158, 11, 0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config
