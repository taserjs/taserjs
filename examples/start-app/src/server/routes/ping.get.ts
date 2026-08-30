import { t } from "@taserjs/router";
import { json } from "@taserjs/router/reply";

export default t.get("/ping").handler(() => json({ pong: true, from: "taser" }));
