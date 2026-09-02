import { t } from "@taserjs/router";
import { json } from "@taserjs/router/reply";

export default t.post("/").handler((_ctx) => {
  return json({ ok: true });
});
