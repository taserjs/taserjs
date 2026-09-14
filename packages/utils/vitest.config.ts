import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "utils",
    dir: "./tests",
    environment: "node",
    globals: true,
    watch: false,
  },
});
