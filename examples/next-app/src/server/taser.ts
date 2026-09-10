import { defineTaser } from "@taserjs/router";
import { notFound } from "@taserjs/router/reply";
import { context } from "./context";

export default defineTaser()
  .basePath("/api")
  .context(context)
  .notFound(() => notFound({ message: "Not Found" }));
