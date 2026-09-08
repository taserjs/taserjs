import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "cli",
    dir: "./tests",
    environment: "node",
    globals: true,
    watch: false,
  },
});
