import { json } from "@taserjs/router/reply";
import { t } from "#taserjs/router";

const GET = t.get("/users");

export type RouteContext = typeof GET.$Infer.Context;
export const Route = GET.handler((_ctx) => {
  return json({ ok: true });
});
