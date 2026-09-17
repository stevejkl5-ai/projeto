/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0f14",
        panel: "#121822",
        panel2: "#1a222f",
        border: "#232d3b",
        accent: "#3b82f6",
        accentSoft: "#1e3a5f",
        text: "#e6e9ee",
        muted: "#8b98a9"
      }
    }
  },
  plugins: []
};
