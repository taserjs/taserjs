import { t } from "@taserjs/router";
import { json } from "@taserjs/router/reply";

export default t.get("/hello").handler((_ctx) => {
  return json({
    greeting: `Hello, World!`,
    from: "taser",
  });
});
