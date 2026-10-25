import { t } from "@taserjs/router";
import { json } from "@taserjs/router/reply";

export default t.get("/hello").handler(async () => {
  return json({ message: "Hello from /hello" });
});
