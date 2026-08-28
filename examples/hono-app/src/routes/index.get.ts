import { json } from "@taserjs/router/reply";
import { t } from "#taserjs/router";

export const Route = t.get("/").handler((ctx) => {
  return json({
    message: "Hello from Taser root!",
    requestId: ctx.requestId,
    clientIp: ctx.clientIp,
  });
});
