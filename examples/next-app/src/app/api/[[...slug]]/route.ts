import { app } from "@/.taser/entry";

const handle = (request: Request) => {
  console.log(request.url)
  return app.fetch(request);
};

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
export const PATCH = handle;
export const OPTIONS = handle;
export const HEAD = handle;
