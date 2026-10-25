import { createClient } from "@taserjs/client";

import type { AppManifest } from "./server/.taserjs/routes.gen";

export const api = createClient<AppManifest>({
  baseUrl: "/api",
});

// Call routes with the same shape as the files under src/server/routes:
//
//   const response = await api.$get(); // GET /api
//   if (response.ok) console.log(await response.json());
