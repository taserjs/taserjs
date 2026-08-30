import { createTaserApp } from "@taserjs/router";

// Without a .notFound() handler, non-taser requests fall through to the host
// (TanStack Start's SSR handler) instead of returning a 404 response.
export default createTaserApp().notFound(() => new Response("Not Found", { status: 404 }));
