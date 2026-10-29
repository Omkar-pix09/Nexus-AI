/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { ink: "#05070d", neon: "#22e6c9", violet: "#8b5cf6", ember: "#fb7185", amber: "#fbbf24" },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"], mono: ["JetBrains Mono", "ui-monospace", "monospace"] },
      keyframes: { float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } }, pulseRing: { "0%": { transform: "scale(.9)", opacity: ".7" }, "100%": { transform: "scale(1.8)", opacity: "0" } } },
      animation: { float: "float 6s ease-in-out infinite", ring: "pulseRing 1.6s ease-out infinite" },
    },
  },
  plugins: [],
};
