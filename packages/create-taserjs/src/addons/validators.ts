import type { ValidatorId } from "../core/types";
import type { AddonDefinition } from "./types";

export const IMPORT_LINES: Record<ValidatorId, string> = {
  zod: `import { z } from 'zod'`,
  arktype: `import { type } from 'arktype'`,
  valibot: `import * as v from 'valibot'`,
};

export const VALIDATION_BLOCK_TEMPLATE: Record<ValidatorId, string> = {
  zod: `
  .query(z.object({ name: z.string().default('Taser') }))`,
  arktype: `
  .query(type({ 'name?': 'string = "Taser"' }))`,
  valibot: `
  .query(v.object({ name: v.optional(v.string(), 'Taser') }))`,
};

const ROUTE_TEMPLATE = (validator: ValidatorId) => `import { reply } from '@taserjs/router'
import { t } from '#src/taser.js'
${IMPORT_LINES[validator]}

const GET = t.get('/')${VALIDATION_BLOCK_TEMPLATE[validator]}

export type RouteContext = typeof GET.$Infer.Context
export const Route = GET.handler((ctx) => {
  return reply.json({ message: \`Hello, \${ctx.query.name}!\` })
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
