import { t } from "@taserjs/router";
import { json } from "@taserjs/router/reply";

export default t.get("/").handler(({ state }) => {
  return json({ message: "Hello from Taser.js + Nitro!", appName: state.appName });
});
