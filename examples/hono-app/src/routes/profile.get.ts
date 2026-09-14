import { t } from "@taserjs/router";
import { json } from "@taserjs/router/reply";

export default t.get("/profile").handler(({ state }) => {
  return json({ ok: "profile", userId: state.userId });
});
