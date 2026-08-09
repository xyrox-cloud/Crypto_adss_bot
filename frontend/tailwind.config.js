/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    borderRadius: {
      'none': '0',
      'sm': '0',
      DEFAULT: '0',
      'md': '0',
      'lg': '0',
      'xl': '0',
      '2xl': '0',
      '3xl': '0',
      'full': '0',
    },
    extend: {
      colors: {
        background: '#0A0A0A',
        cardbg: '#141414',
        cardborder: '#242424',
        primary: '#26A17B',
        secondary: '#FF5A1F',
        success: '#3ECF8E',
        textmuted: '#8A8A8A',
      },
      fontFamily: {
        mono: ['"Courier New"', 'Courier', 'monospace'], // Monospace style requested
      }
    },
  },
  plugins: [],
}
