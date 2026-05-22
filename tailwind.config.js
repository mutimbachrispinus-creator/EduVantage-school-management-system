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
    },
  },
  plugins: [],
};
