import type { ValidatorId } from "../core/types";
import type { AddonDefinition } from "./types";

export const IMPORT_LINES: Record<ValidatorId, string> = {
  zod: `import { z } from 'zod'`,
  arktype: `import { type } from 'arktype'`,
  valibot: `import * as v from 'valibot'`,
};

export const VALIDATION_BLOCK_TEMPLATE: Record<ValidatorId, string> = {
  zod: `
  .query(z.object({ name: z.string().default('Taser.js') }))`,
  arktype: `
  .query(type({ 'name?': 'string = "Taser.js"' }))`,
  valibot: `
  .query(v.object({ name: v.optional(v.string(), 'Taser.js') }))`,
};

const ROUTE_TEMPLATE = (validator: ValidatorId) => `import { t } from '@taserjs/router'
import { json } from '@taserjs/router/reply'
${IMPORT_LINES[validator]}

export default t.get('/')${VALIDATION_BLOCK_TEMPLATE[validator]}
  .handler((ctx) => {
    return json({ message: \`Hello, \${ctx.query.name}!\` })
  })
`;

export const ValidatorAddon = (validator: ValidatorId): AddonDefinition => {
  return {
    id: validator,
    category: "validator",
    dependencies: () => [validator],
    devDependencies: () => [],
    apply: (ctx, write) => write("src/routes/index.get.ts", ROUTE_TEMPLATE(validator)),
  };
};
