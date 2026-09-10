import { defineTaser } from "@taserjs/router";
import { notFound } from "@taserjs/router/reply";

export default defineTaser()
  .basePath("/api")
  .notFound(() => notFound({ message: "Not Found" }));
