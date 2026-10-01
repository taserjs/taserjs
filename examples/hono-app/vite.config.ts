import { taser } from "@taserjs/plugin/vite";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [taser({ standalone: false }), nitro()],
});
