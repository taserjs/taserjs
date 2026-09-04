import { t } from "@taserjs/router";
import { json } from "@taserjs/router/reply";

export default t.get("/").handler((ctx) => {
  return json({
    // message: "Hello from Taser root!",
    // requestId: ctx.requestId,
    framework: "taser",
    status: "ok",
  });
});
