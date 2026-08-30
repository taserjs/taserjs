import { t } from "@taserjs/router";
import { json } from "@taserjs/router/reply";

export default t.get("/users").handler((_ctx) => {
  return json({ ok: true });
});
