import { defineConfig } from "vite";
import { nitro } from "nitro/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { taser } from "@taserjs/router-plugin/vite";

export default defineConfig({
  plugins: [
    taser({
      serverDir: "src/server",
      basePath: "/api",
      server: false,
    }),
    tanstackStart(),
    viteReact(),
    // nitro(),
  ],
});
