import { defineConfig } from "vite";
import { nitro } from "nitro/vite";
import { taser } from "@taserjs/router-plugin/vite";

export default defineConfig({
  plugins: [taser({ basePath: "/taser" }), nitro()],
});
