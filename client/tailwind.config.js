/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f7fa',
          100: '#e4ecf5',
          200: '#c8daf0',
          300: '#9cbce5',
          400: '#6999d6',
          500: '#477bc4',
          600: '#3561a3',
          700: '#2c4e85',
          800: '#274370',
          900: '#233a5e',
          950: '#17243d',
        },
        safety: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        }
      },
    },
  },
  plugins: [],
}
