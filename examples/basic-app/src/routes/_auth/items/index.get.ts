import { t } from "@taserjs/router";
import { json } from "@taserjs/router/reply";

export default t.get("/items").handler(() => {
  return json({ items: ["item-1", "item-2"] });
});
