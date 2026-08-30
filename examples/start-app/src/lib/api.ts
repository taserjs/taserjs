import { createClient } from "@taserjs/router-client";
import type { routeManifest } from "#taserjs/virtual/manifest";

export const api = createClient<typeof routeManifest>({
  baseUrl: `/api`,
});
