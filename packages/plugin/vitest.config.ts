import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "plugin",
    dir: "./tests",
    environment: "node",
    globals: true,
    watch: false,
  },
});
