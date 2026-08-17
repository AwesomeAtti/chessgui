// `defineConfig` comes from vitest rather than vite so the `test` block below is typed. This is
// vitest's own documented arrangement, and the reason to keep one file rather than two is the
// `@` alias: tests must resolve imports exactly as the app does, and an alias defined twice is an
// alias that eventually disagrees with itself.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// Tauri expects a fixed port and does not want vite obscuring rust errors.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    // Safari 13 / WebKitGTK-compatible target per Tauri's guidance.
    target: "es2021",
    sourcemap: true,
  },
  test: {
    // `node`, not `jsdom`: everything worth testing right now is pure logic — the PGN walker,
    // and the import rules that follow it. Component tests would need a DOM environment and a
    // renderer, and neither has earned its place yet. Add them when there is a component whose
    // behaviour is not obvious from looking at it.
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Explicit imports from "vitest" instead of globals, so a test file's dependencies are
    // visible in the file and `tsc --noEmit` checks them like any other import.
    globals: false,
  },
});
