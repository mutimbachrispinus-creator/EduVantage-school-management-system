/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy:    '#050F1C',
        navy2:   '#0D1F3C',
        navy3:   '#152D4F',
        maroon:  '#8B1A1A',
        maroon2: '#6B1212',
        gold:    '#D97706',
        gold2:   '#FCD34D',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        sora:  ['Sora',  'sans-serif'],
      },
      borderRadius: {
        portal: '16px',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(79, 70, 229, 0.4)' },
          '50%': { boxShadow: '0 0 20px 0 rgba(79, 70, 229, 0.2)' },
        },
        pulseGlowLanding: {
          '0%': { boxShadow: '0 0 8px rgba(252, 211, 77, 0.4), 0 0 16px rgba(255, 255, 255, 0.2)', transform: 'scale(1)' },
          '100%': { boxShadow: '0 0 16px rgba(252, 211, 77, 0.8), 0 0 32px rgba(255, 255, 255, 0.5)', transform: 'scale(1.05)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'wa-pulse': {
          '0%': { transform: 'scale(1)', opacity: '0.8' },
          '70%': { transform: 'scale(1.6)', opacity: '0' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        }
      },
      animation: {
        pulseGlow: 'pulseGlow 3s infinite',
        pulseGlowLanding: 'pulseGlowLanding 2.5s infinite alternate',
        fadeInUp: 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        fadeIn: 'fadeIn 0.4s ease-out forwards',
        'wa-pulse': 'wa-pulse 2s ease-out infinite',
      }
    },
  },
  plugins: [],
};
