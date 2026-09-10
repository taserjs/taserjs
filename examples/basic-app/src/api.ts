import { createClient } from "@taserjs/client";
import type { AppManifest } from "./.taserjs/routes.gen.js";

export const client = createClient<AppManifest>({
  baseUrl: "http://localhost:5173",
});
