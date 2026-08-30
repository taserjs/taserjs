import { createClient } from "@taserjs/router-client";
import type { app } from "@/.taser/entry";

export const api = createClient<typeof app>({
  baseUrl: "http://localhost:3000/api",
});
