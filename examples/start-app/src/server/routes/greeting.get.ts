import { t } from "@taserjs/router";
import { json } from "@taserjs/router/reply";

export default t.get("/greeting").handler((_ctx) => {
  return json({ greeting: "Hello from taser inside TanStack Start!" });
});
