import { t } from "@taserjs/router";
import { json } from "@taserjs/router/reply";
import z from "zod";

export default t
  .post("/save")
  .body(z.object({ name: z.string() }), "form")
  .handler(async ({ req }) => {
    return json({ message: "Hello from /save", body: req.body });
  });
