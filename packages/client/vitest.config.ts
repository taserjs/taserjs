import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "client",
    dir: "./tests",
    environment: "node",
    globals: true,
    watch: false,
  },
});
