/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /* Six Surface Elevations */
        surface: {
          0: "#04060b", /* Base void */
          1: "#070a12", /* Layer 1 canvas */
          2: "#0a0f1b", /* Layer 2 recessed */
          3: "#0e1524", /* Layer 3 card baseline */
          4: "#121a2b", /* Layer 4 elevated/hover */
          5: "#18233a", /* Layer 5 overlay/popover */
        },
        /* Bioluminescent Accents */
        sonar: {
          DEFAULT: "#22e6c9",
          muted: "rgba(34, 230, 201, 0.15)",
          border: "rgba(34, 230, 201, 0.40)",
          dim: "#179e8a",
        },
        plasma: {
          DEFAULT: "#8b5cf6",
          muted: "rgba(139, 92, 246, 0.15)",
          border: "rgba(139, 92, 246, 0.40)",
          dim: "#6d44c7",
        },
        signal: {
          DEFAULT: "#fbbf24",
          muted: "rgba(251, 191, 36, 0.15)",
          border: "rgba(251, 191, 36, 0.40)",
          dim: "#c79213",
        },
        alarm: {
          DEFAULT: "#fb7185",
          muted: "rgba(251, 113, 133, 0.15)",
          border: "rgba(251, 113, 133, 0.40)",
          dim: "#c8475a",
        },
        /* Semantic Aliases */
        semantic: {
          evidence: "#8b5cf6",
          gap: "#fb7185",
          calculated: "#22e6c9",
          estimated: "#fbbf24",
        },
        ink: "#04060b",
        neon: "#22e6c9",
      },
      fontFamily: {
        display: ["Space Grotesk", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        "scale-xs": ["0.694rem", { lineHeight: "1rem" }],
        "scale-sm": ["0.833rem", { lineHeight: "1.25rem" }],
        "scale-base": ["1rem", { lineHeight: "1.5rem" }],
        "scale-md": ["1.2rem", { lineHeight: "1.75rem" }],
        "scale-lg": ["1.44rem", { lineHeight: "1.875rem" }],
        "scale-xl": ["1.728rem", { lineHeight: "2.125rem" }],
        "scale-2xl": ["2.074rem", { lineHeight: "2.5rem" }],
        "scale-3xl": ["2.488rem", { lineHeight: "2.875rem" }],
        "scale-4xl": ["2.986rem", { lineHeight: "3.25rem" }],
      },
      borderRadius: {
        "nexus-sm": "8px",
        "nexus-md": "12px",
        "nexus-lg": "16px",
        "nexus-xl": "24px",
      },
      boxShadow: {
        "glow-sonar": "0 0 20px rgba(34, 230, 201, 0.45), 0 0 45px rgba(34, 230, 201, 0.2)",
        "glow-sonar-lg": "0 0 35px rgba(34, 230, 201, 0.6), 0 0 70px rgba(34, 230, 201, 0.25)",
        "glow-plasma": "0 0 20px rgba(139, 92, 246, 0.45), 0 0 45px rgba(139, 92, 246, 0.2)",
        "glow-signal": "0 0 20px rgba(251, 191, 36, 0.45), 0 0 45px rgba(251, 191, 36, 0.2)",
        "glow-alarm": "0 0 20px rgba(251, 113, 133, 0.45), 0 0 45px rgba(251, 113, 133, 0.2)",
        "glass": "0 16px 40px -12px rgba(0, 0, 0, 0.85), inset 0 1px 0 0 rgba(255, 255, 255, 0.10)",
      },
      transitionTimingFunction: {
        abyssal: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
      transitionDuration: {
        instant: "120ms",
        fast: "220ms",
        steady: "420ms",
        deep: "800ms",
      },
      keyframes: {
        sonarSweep: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        biopulse: {
          "0%, 100%": { opacity: "0.95", filter: "drop-shadow(0 0 8px rgba(34, 230, 201, 0.5))" },
          "50%": { opacity: "0.4", filter: "drop-shadow(0 0 2px rgba(34, 230, 201, 0.1))" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "sonar-sweep": "sonarSweep 4s linear infinite",
        "biopulse": "biopulse 2.4s ease-in-out infinite",
        "shimmer": "shimmer 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
