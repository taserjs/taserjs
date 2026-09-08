import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "router",
    dir: "./tests",
    environment: "node",
    globals: true,
    watch: false,
  },
});
