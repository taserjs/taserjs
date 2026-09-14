import { defineConfig } from "nitro/config";
import { taser } from "@taserjs/plugin/nitro";

export default defineConfig({
  preset: "node-server",
  modules: [taser({ standalone: true })],
});
