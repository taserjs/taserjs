import { t } from "@taserjs/router";
import { json } from "@taserjs/router/reply";

export default t.get("/posts/:category?").handler(async ({ req }) => {
  return json({ category: req.params.category ?? "all" });
});
