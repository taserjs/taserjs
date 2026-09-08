import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "runtime",
    dir: "./tests",
    environment: "node",
    globals: true,
    watch: false,
  },
});
