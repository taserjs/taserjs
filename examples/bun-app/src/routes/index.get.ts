import { t } from "@taserjs/router";
import { json } from "@taserjs/router/reply";

export default t.get("/").handler((_ctx) => {
  return json({ message: "Welcome to Taser.js on Bun!" });
});
