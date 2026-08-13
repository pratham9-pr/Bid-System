/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        rajdhani: ['Rajdhani', 'sans-serif'],
        inter:    ['Inter', 'sans-serif'],
      },
      colors: {
        fire: {
          50:  '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        gold: {
          300: '#fde68a',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        surface: {
          950: '#06060f',
          900: '#0a0a18',
          800: '#0f0f24',
          700: '#161630',
          600: '#1e1e3f',
          500: '#272750',
          400: '#333368',
        },
        muted: '#6b6b90',
      },
      animation: {
        'pulse-glow':    'pulseGlow 2s ease-in-out infinite',
        'slide-up':      'slideUp 0.4s ease-out',
        'fade-in':       'fadeIn 0.3s ease-out',
        'pop-in':        'popIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'shimmer':       'shimmer 2s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 15px 2px rgba(249, 115, 22, 0.3)' },
          '50%':      { boxShadow: '0 0 30px 8px rgba(249, 115, 22, 0.6)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        popIn: {
          from: { opacity: '0', transform: 'scale(0.85)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'fire-gradient':   'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #c2410c 100%)',
        'gold-gradient':   'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
        'surface-gradient':'linear-gradient(180deg, #0f0f24 0%, #06060f 100%)',
        'card-texture':    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='%230a0a18'/%3E%3Crect x='0' y='0' width='1' height='1' fill='%230f0f24'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%230f0f24'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};
