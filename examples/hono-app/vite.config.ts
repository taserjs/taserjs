import { defineConfig } from "vite";
import { taser } from "@taserjs/plugin/vite";
import { nitro } from "nitro/vite";

export default defineConfig({
  plugins: [taser({ standalone: false }), nitro()],
});
