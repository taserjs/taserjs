import type { ValidatorId } from "../core/types.js";
import type { AddonDefinition } from "./types.js";

export const IMPORT_LINES: Record<ValidatorId, string> = {
  zod: `import { z } from "zod";`,
  arktype: `import { type } from "arktype";`,
  valibot: `import * as v from "valibot";`,
};

export const QUERY_SCHEMA_EXPR: Record<ValidatorId, string> = {
  zod: `z.object({ name: z.string().default("Taser.js") })`,
  arktype: `type({ "name?": 'string = "Taser.js"' })`,
  valibot: `v.object({ name: v.optional(v.string(), "Taser.js") })`,
};

export const ValidatorAddon = (validator: ValidatorId): AddonDefinition => {
  return {
    id: validator,
    category: "validator",
    dependencies: () => [validator],
    devDependencies: () => [],
    apply: async (_ctx, write) => {
      const content = `import { t } from "@taserjs/router";
${IMPORT_LINES[validator]}

export default t
  .get("/")
  .query(${QUERY_SCHEMA_EXPR[validator]})
  .handler(({ req }) => {
    return Response.json({ message: \`Hello, \${req.query.name}!\` });
  });
`;
      await write("src/routes/index.get.ts", content);
    },
  };
};
