import { createClient } from "@taserjs/router-client";
import type { routeManifest } from "../../.taser/types/routes.js";

export const api = createClient<typeof routeManifest>({
  baseUrl: `/api`,
});
