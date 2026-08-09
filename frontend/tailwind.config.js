/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0A',
        cardbg: '#141414',
        cardborder: '#242424',
        primary: '#29C5F6',
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
