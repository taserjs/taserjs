import { createClient } from "@taserjs/client";
import type { AppManifest } from "@/server/.taserjs/routes.gen";

export const api = createClient<AppManifest>({
  baseUrl: "http://localhost:3000/api",
});
