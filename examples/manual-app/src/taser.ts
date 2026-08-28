import { createTaserApp } from "@taserjs/router";

// Without a .notFound() handler, unmatched requests fall through to the host
// framework exported from src/server.ts instead of returning a 404 response.
export const t = createTaserApp();
