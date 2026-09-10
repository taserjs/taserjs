import { app } from "@/server/.taserjs/routes.gen";

const handle = (request: Request) => {
  return app.fetch(request);
};

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
export const PATCH = handle;
export const OPTIONS = handle;
export const HEAD = handle;
