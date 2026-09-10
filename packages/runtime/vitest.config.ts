import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "runtime",
    include: ["tests/**/*.test.ts"],
    benchmark: {
      include: ["bench/**/*.bench.ts"],
    },
    environment: "node",
    globals: true,
    watch: false,
  },
});
