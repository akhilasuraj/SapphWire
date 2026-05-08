/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FDF5E6",
        "cream-2": "#F8EAD0",
        paper: "#FFFCF5",
        ink: "#2E2A4A",
        "ink-soft": "#4A4670",
        "ink-mute": "#8782AA",
        mint: "#B7E8CF",
        "mint-deep": "#6FCBA0",
        pink: "#FFC2D1",
        "pink-deep": "#F58FAE",
        lavender: "#D6C7FF",
        "lavender-deep": "#A793F0",
        peach: "#FFCDA8",
        "peach-deep": "#F49E6E",
        butter: "#FFE69A",
        "butter-deep": "#F2C94C",
        sky: "#BCDFFB",
        "sky-deep": "#6EB1EA",
        coral: "#FFB3A7",
        "coral-deep": "#F07A66",
      },
    },
  },
  plugins: [],
};
