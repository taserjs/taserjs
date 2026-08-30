import { t } from "@taserjs/router";
import { json } from "@taserjs/router/reply";

export default t.get("/").handler((ctx) => {
  return json({ message: "Hello from taser + srvx (no nitro)!", appName: ctx.state.appName });
});
