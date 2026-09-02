import { t } from "@taserjs/router";
import { json } from "@taserjs/router/reply";

export default t.query("/").handler((_ctx) => {
  return json({ ok: "query" });
});
