import { createClient } from "@taserjs/client";
import type { RouteManifest } from "@/server/.taserjs/routes.gen";

export const api = createClient<RouteManifest>({
  baseUrl: "http://localhost:3000/api",
});
