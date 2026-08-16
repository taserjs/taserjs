import { defineConfig, mergeConfig } from "vitest/config";
import { tanstackViteConfig } from "@tanstack/vite-config";

export default mergeConfig(
  defineConfig({
    test: {
      name: "router-client",
      dir: "./tests",
      environment: "node",
      globals: true,
      watch: false,
    },
  }),
  tanstackViteConfig({ entry: "./src/index.ts", srcDir: "./src" }),
);
