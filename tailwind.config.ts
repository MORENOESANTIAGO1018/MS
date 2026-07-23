import type { Config } from "tailwindcss";

// Paleta sóbria/jurídica: azul-marinho profundo + dourado sutil de destaque.
// Ver docs/design-system.md (Fase 12) para racional de uso.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#0f1f3d",
          "navy-light": "#1c3363",
          gold: "#a9862f",
          "gold-light": "#c9a75a",
        },
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f4f5f7",
          dark: "#0b1526",
        },
        status: {
          success: "#1c7d4d",
          warning: "#b3760b",
          danger: "#b3261e",
          info: "#1d4c8f",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      borderRadius: {
        xl: "0.875rem",
      },
    },
  },
  plugins: [],
};

export default config;
