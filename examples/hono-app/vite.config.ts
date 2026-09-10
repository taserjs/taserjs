import { defineConfig } from "vite";
import { taser } from "@taserjs/plugin/vite";

export default defineConfig({
  plugins: [taser()],
});
