import type { ScaffoldContext } from '../core/types.js'

export type BootBinding = {
  key: string
  importPath: string
  factoryName: string
}

export type FileWriter = (filePath: string, contents: string) => Promise<void>

export type AddonDefinition = {
  id: string
  category: 'database' | 'logger'
  dependencies: (ctx: ScaffoldContext) => string[]
  devDependencies: (ctx: ScaffoldContext) => string[]
  scripts?: (ctx: ScaffoldContext) => Record<string, string>
  bootBinding: (ctx: ScaffoldContext) => BootBinding
  apply: (ctx: ScaffoldContext, write: FileWriter) => Promise<void>
}
