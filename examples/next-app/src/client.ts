import { createClient } from "@taserjs/router-client";

export const api = createClient({
  baseUrl: 'http://localhost:3000/api',
});