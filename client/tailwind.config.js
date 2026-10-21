/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0e1a24",
          900: "#152532",
          800: "#1d3344",
          700: "#2a4a60",
        },
        paper: {
          50: "#f7f3ea",
          100: "#efe6d4",
          200: "#e2d4b6",
        },
        brass: {
          400: "#d4a853",
          500: "#c4922c",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
