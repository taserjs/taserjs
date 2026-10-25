import { t } from "@taserjs/router";
import { json } from "@taserjs/router/reply";

export default t.get("/").handler(() => {
  return json({ message: "Welcome to Taser.js!" });
});
