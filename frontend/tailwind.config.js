/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#050505',
          light: '#0d0d0d',
          surface: '#121212',
          border: '#222222',
        },
        bone: {
          DEFAULT: '#b6b095',
          light: '#eae6d6',
          muted: '#807a68',
        },
        crimson: {
          DEFAULT: '#e3131b',
          dark: '#930d12',
          glow: 'rgba(227, 19, 27, 0.25)',
        },
      },
      fontFamily: {
        display: ['"Federant"', '"Uncial Antiqua"', 'Georgia', 'serif'],
        sans: ['"Helvetica Neue"', 'Helvetica', 'Arial', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
