import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FDF8F6',
          100: '#F2E8E5',
          200: '#EADDD7',
          300: '#E0CEC7',
          400: '#D2BAB0',
          500: '#9B6A56',
          600: '#7B4E3B',
          700: '#5F3929',
          800: '#462719',
          900: '#2F170D',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
