/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#FFFFFF",
        brand: {
          50:  "#F2EDFF",
          100: "#E7DDFF",
          500: "#6E3BE8",
          600: "#5B2AC9",
          700: "#4B1FA6",
          800: "#3B1688",
          900: "#2C0A73",
        },
      },
    },
  },
  plugins: [],
};
