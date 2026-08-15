import type { ValidatorId } from '../core/types'
import type { AddonDefinition } from './types'

export const IMPORT_LINES: Record<ValidatorId, string> = {
  zod: `import { z } from 'zod'`,
  arktype: `import { type } from 'arktype'`,
  valibot: `import * as v from 'valibot'`,
}

export const VALIDATION_BLOCK_TEMPLATE: Record<ValidatorId, string> = {
  zod: `, {
  query: z.object({ name: z.string() }),
}`,
  arktype: `, {
  query: type({ name: 'string' }),
}`,
  valibot: `, {
  query: v.object({ name: v.string() }),
}`,
}

const ROUTE_TEMPLATE = (validator: ValidatorId) => `import { t } from '#src/taser.js'
${IMPORT_LINES[validator]}

export const Route = t.get('/'${VALIDATION_BLOCK_TEMPLATE[validator]}).handler((ctx) => {
  return ctx.reply.json({ message: \`Hello, \${ctx.query.name}!\` })
})
`

export const ValidatorAddon = (validator: ValidatorId): AddonDefinition => {
  return {
    id: validator,
    category: 'validator',
    dependencies: () => [validator],
    devDependencies: () => [],
    apply: (ctx, write) => write('src/routes/index.get.ts', ROUTE_TEMPLATE(validator)),
  }
}
