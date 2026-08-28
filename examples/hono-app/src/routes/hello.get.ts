import { json } from "@taserjs/router/reply";
import { t } from "#taserjs/router";

export const Route = t
  .get("/hello")
  .handler((ctx) => {
    return json({
      greeting: `Hello, World!`,
      from: "taser",
    });
  });
