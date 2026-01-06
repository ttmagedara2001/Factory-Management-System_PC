/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      screens: {
        xs: "375px", // Extra small screens (iPhone SE, small phones)
        sm: "640px", // Small screens (large phones, landscape)
        md: "768px", // Medium screens (tablets portrait)
        lg: "1024px", // Large screens (tablets landscape, small laptops)
        xl: "1280px", // Extra large screens (desktops)
        "2xl": "1536px", // 2X large screens (large desktops)
        // Orientation-specific breakpoints
        portrait: { raw: "(orientation: portrait)" },
        landscape: { raw: "(orientation: landscape)" },
        // Height-based breakpoints for landscape mode
        short: { raw: "(max-height: 500px)" },
        tall: { raw: "(min-height: 700px)" },
      },
      colors: {
        primary: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      spacing: {
        "safe-bottom": "env(safe-area-inset-bottom)",
        "safe-top": "env(safe-area-inset-top)",
      },
      minHeight: {
        touch: "44px", // Minimum touch target size
      },
      minWidth: {
        touch: "44px",
      },
    },
  },
  plugins: [],
};
