/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        maroon: {
          500: '#6D2323',
        },
        sand: {
          500: '#FEF9E1',
        }
      },
      width: {
        'enough': 'fit-content'
      }
    },
  },
  plugins: [],
}

