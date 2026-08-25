import { defineConfig } from "vite";
import { tanstackViteConfig } from "@tanstack/vite-config";

export default defineConfig({
  ...tanstackViteConfig({
    entry: ["src/index.ts", "src/nitro.ts", "src/writer.ts", "src/aliases.ts"],
    srcDir: "src",
  }),
});
