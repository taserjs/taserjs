// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { app } from "../../server/.taserjs/routes.gen";

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => app.fetch(request),
    },
  },
});
