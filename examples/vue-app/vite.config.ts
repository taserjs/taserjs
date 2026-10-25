import { fileURLToPath, URL } from "node:url";

import { taser } from "@taserjs/plugin/vite";
import vue from "@vitejs/plugin-vue";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import vueDevTools from "vite-plugin-vue-devtools";

// https://vite.dev/config/
export default defineConfig({
  plugins: [taser({ standalone: false }), vue(), vueDevTools(), nitro()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
