import { createClient } from "@taserjs/router-client";
import type { RouteManifest } from "@/.taser/types/routes";

export const api = createClient<RouteManifest>({
  baseUrl: "http://localhost:3000/api",
});
