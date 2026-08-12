import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { generatorConfigSchema } from '@taserjs/router-generator'
import { z } from 'zod'

const outputPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'taser.config.schema.json')

const schema = z.toJSONSchema(generatorConfigSchema, {
  target: 'draft-2020-12',
  io: 'output',
  reused: 'inline',
  unrepresentable: 'any',
})

const document = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://taserjs.dev/schemas/taser.config.schema.json',
  title: 'Taser Router CLI Config',
  type: 'object',
  additionalProperties: false,
  ...schema,
}

writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8')
console.log(`Wrote ${outputPath}`)
