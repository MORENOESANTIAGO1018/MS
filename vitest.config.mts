import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      // Ver tests/stubs/server-only-stub.ts: o pacote real lanca erro fora do
      // bundler do Next.js. A garantia de "nunca chega ao navegador" em
      // producao vem do build do Next + scripts/check-server-only-imports.ts.
      "server-only": fileURLToPath(
        new URL("./tests/stubs/server-only-stub.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "jsdom",
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx", "tests/integration/**/*.test.ts"],
    setupFiles: ["./tests/unit/setup.ts"],
    coverage: {
      reporter: ["text", "html"],
      include: ["src/**"],
    },
  },
});
