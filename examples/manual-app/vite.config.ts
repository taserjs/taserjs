import { defineConfig } from "vite";
import { taser } from "@taserjs/router-plugin/vite";

export default defineConfig({
  plugins: [taser()],
});
