/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Cinzel', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        gold: {
          50: '#FBF8F0',
          100: '#F6EEDC',
          200: '#EBD9B4',
          300: '#DEC28A',
          400: '#D4AF37',
          500: '#C5A880',
          600: '#A98947',
          700: '#846830',
          800: '#5F4A22',
          900: '#3D2F15',
        },
        obsidian: {
          800: '#1A202C',
          900: '#0F141F',
          950: '#090D15',
        },
        alabaster: '#FAF8F5',
        sand: '#F3EFEA',
      },
    },
  },
  plugins: [],
}
