/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        ozark: {
          900: '#09090b', // Deep background (Zinc 950)
          800: '#18181b', // Card background (Zinc 900)
          700: '#27272a', // Borders (Zinc 800)
          accent: '#06b6d4', // Cyan accent
        }
      }
    },
  },
  plugins: [],
}