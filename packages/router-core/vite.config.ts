import { defineConfig, mergeConfig } from "vitest/config";
import { tanstackViteConfig } from "@tanstack/vite-config";

const config = defineConfig({
  test: {
    name: "router-core",
    dir: "./tests",
    environment: "node",
    globals: true,
    watch: false,
    benchmark: {
      compare: `benchmarks/results/bench.json`,
      outputJson: `benchmarks/results/${Date.now()}.json`,
    },
  },
});

export default mergeConfig(
  config,
  tanstackViteConfig({
    entry: "./src/index.ts",
    srcDir: "./src",
  }),
);
