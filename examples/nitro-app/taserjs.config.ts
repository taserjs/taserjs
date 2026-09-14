import { defineConfig } from "@taserjs/cli";

export default defineConfig({
  serverDir: "src",
  routesDir: "routes",
  outputDir: ".taserjs",
  app: "taser.ts",
});
