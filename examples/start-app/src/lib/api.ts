import { createClient } from "@taserjs/router-client";

export const api = createClient({
  baseUrl: `/api`,
});
