import { t } from "@taserjs/router";
import { json } from "@taserjs/router/reply";

export default t.get("/files/*").handler(async ({ req }) => {
  return json({ message: "Hello from /files/*", splat: req.params._splat });
});
