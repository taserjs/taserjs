import { defineConfig } from "@taserjs/cli";

export default defineConfig({
  serverDir: "src/server",
  routesDir: "routes",
  outputDir: ".taserjs",
  app: "taser.ts",
});
