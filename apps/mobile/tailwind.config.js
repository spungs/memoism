/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#4F46E5",
        secondary: "#10B981",
        background: "#F9FAFB",
        surface: "#FFFFFF",
        error: "#EF4444",
        text: {
          primary: "#111827",
          secondary: "#6B7280",
        },
      },
    },
  },
  plugins: [],
}; 