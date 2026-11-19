/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
    "./src/hooks/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Colorpoint tokens (bg-point, text-textMuted, …). Legacy keys below are removed in Task 16.
        ...require('./src/theme/palette'),
        background: '#09090b',
        card: '#18181b',
        cardBorder: '#27272a',
        primary: '#10b981', // emerald 500
        secondary: '#06b6d4', // cyan 500
        protein: '#3b82f6', // blue 500
        carbs: '#f59e0b', // amber 500
        fat: '#ec4899', // pink 500
      },
    },
  },
  plugins: [],
};
