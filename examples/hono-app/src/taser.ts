import { defineTaser } from "@taserjs/router";
import { context } from "./context.js";

export default defineTaser()
  .basePath("/api")
  .context(context)
  .notFound(({ req }) => Response.json({ message: `Not Found: ${req.url}` }, { status: 404 }));
