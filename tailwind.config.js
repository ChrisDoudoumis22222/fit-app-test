/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/index.html",          // CRA
    "./index.html",                 // Vite
    "./src/**/*.{js,jsx,ts,tsx}",   // all React components
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
