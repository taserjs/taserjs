import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "create-taserjs",
    dir: "./tests",
    environment: "node",
    globals: true,
    watch: false,
  },
});
