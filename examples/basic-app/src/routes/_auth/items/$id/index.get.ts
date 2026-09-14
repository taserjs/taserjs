import { t } from "@taserjs/router";
import { json } from "@taserjs/router/reply";

export default t.get("/items/:id").handler(({ req, state }) => {
  return json({ id: req.params.id, currentItemId: state.currentItemId });
});
