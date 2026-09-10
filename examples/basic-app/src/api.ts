import { createClient } from "@taserjs/client";
import type { RouteManifest } from "./.taserjs/routes.gen.js";

export const client = createClient<RouteManifest>({
  baseUrl: "http://localhost:5173",
});
