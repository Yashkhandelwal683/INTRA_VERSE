/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50:  'rgb(240 244 255)',
          100: 'rgb(224 234 255)',
          200: 'rgb(199 215 254)',
          300: 'rgb(165 187 252)',
          400: 'rgb(129 150 248)',
          500: 'rgb(99 102 241)',
          600: 'rgb(79 70 229)',
          700: 'rgb(67 56 202)',
          800: 'rgb(55 48 163)',
          900: 'rgb(49 46 129)',
          950: 'rgb(30 27 75)',
        },
        accent: {
          50:  'rgb(255 247 237)',
          100: 'rgb(255 237 213)',
          200: 'rgb(254 215 170)',
          300: 'rgb(253 186 116)',
          400: 'rgb(251 146 60)',
          500: 'rgb(249 115 22)',
          600: 'rgb(234 88 12)',
          700: 'rgb(194 65 12)',
          800: 'rgb(154 52 18)',
          900: 'rgb(124 45 18)',
        },
        surface: {
          DEFAULT: 'rgb(15 15 26)',
          card:    'rgb(22 24 42)',
          border:  'rgb(37 40 64)',
          input:   'rgb(30 32 53)',
        },
        // Attendee panel identity — teal-forward, distinct from
        // primary (public/indigo), violet (organizer) and blue (admin).
        mint: {
          50:  'rgb(240 253 250)',
          100: 'rgb(204 251 241)',
          200: 'rgb(153 246 228)',
          300: 'rgb(103 232 205)',
          400: 'rgb(45 212 191)',
          500: 'rgb(20 184 166)',
          600: 'rgb(13 148 136)',
          700: 'rgb(15 118 110)',
          800: 'rgb(17 94 89)',
          900: 'rgb(19 78 74)',
          950: 'rgb(4 47 46)',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-glow': 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.3), transparent)',
        'hero-glow-mint': 'radial-gradient(ellipse 80% 55% at 15% -20%, rgba(20,184,166,0.28), transparent)',
      },
      boxShadow: {
        glow:    '0 0 40px -10px rgba(99,102,241,0.5)',
        'glow-sm': '0 0 20px -5px rgba(99,102,241,0.4)',
        card:    '0 4px 24px rgba(0,0,0,0.4)',
        'glow-mint': '0 0 40px -10px rgba(20,184,166,0.5)',
        'glow-mint-sm': '0 0 20px -5px rgba(20,184,166,0.45)',
      },
      animation: {
        'fade-in':    'fadeIn 0.4s ease-out',
        'slide-up':   'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'spin-slow':  'spin 8s linear infinite',
        'bounce-dot': 'bounceDot 1.4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' },                      to: { opacity: '1' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { from: { opacity: '0', transform: 'translateY(-10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        bounceDot: {
          '0%, 80%, 100%': { transform: 'scale(0)' },
          '40%':            { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
