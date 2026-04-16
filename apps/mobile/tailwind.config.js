// Brand colors come from packages/shared/src/colors.ts — edit there, not here.
const { COLORS } = require('@acuo/shared');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: COLORS.primary,
        secondary: COLORS.secondary,
      },
    },
  },
  plugins: [],
};
