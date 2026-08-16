import { defineConfig, mergeConfig } from "vitest/config";
import { tanstackViteConfig } from "@tanstack/vite-config";

export default mergeConfig(
  defineConfig({
    test: {
      name: "create-taser",
      dir: "./tests",
      environment: "node",
      globals: true,
      watch: false,
    },
  }),
  tanstackViteConfig({ entry: "./src/cli.ts", srcDir: "./src" }),
);
