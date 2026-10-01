import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { taser } from "@taserjs/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    taser(),
    tanstackStart({ router: { quoteStyle: "double", semicolons: true } }),
    viteReact(),
    nitro(),
  ],
});
