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
          // Mais escuro que `gold`: usar para texto sobre fundo claro
          // (contraste 5.05:1 vs. 3.42:1 do `gold`, atende WCAG AA para texto normal).
          "gold-text": "#876b25",
        },
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f4f5f7",
          dark: "#0b1526",
        },
        status: {
          success: "#1c7d4d",
          // Escurecido de #b3760b: o tom original so alcanca 3.8:1 sobre
          // branco, abaixo do minimo de 4.5:1 do WCAG AA para texto normal.
          warning: "#8f5e08",
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
