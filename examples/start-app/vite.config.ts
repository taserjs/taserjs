import { defineConfig } from "vite";
import { nitro } from "nitro/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { taser } from "@taserjs/plugin/vite";

export default defineConfig({
  plugins: [
    taser(),
    tanstackStart({ router: { quoteStyle: "double", semicolons: true } }),
    viteReact(),
    nitro(),
  ],
});
