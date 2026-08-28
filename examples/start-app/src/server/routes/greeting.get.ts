import { json } from "@taserjs/router/reply";
import { t } from "#taserjs/router";

const GET = t.get("/greeting");

export type RouteContext = typeof GET.$Infer.Context;
export const Route = GET.handler((_ctx) => {
  return json({ greeting: "Hello from taser inside TanStack Start!" });
});
