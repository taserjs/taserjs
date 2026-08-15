import { arktypeAddon } from './arktype/index.js'
import { drizzleAddon } from './drizzle/index.js'
import { kyselyAddon } from './kysely/index.js'
import { pinoAddon } from './pino/index.js'
import { prismaAddon } from './prisma/index.js'
import { valibotAddon } from './valibot/index.js'
import { winstonAddon } from './winston/index.js'
import { zodAddon } from './zod/index.js'
import type { AddonDefinition } from './types.js'
import type { CapabilitiesCatalog, ScaffoldContext } from '../core/types.js'
import {
  DB_DRIVERS,
  DB_ODMS,
  DEFAULT_DB_DRIVER,
  FRAMEWORKS,
  LOGGERS,
  VALIDATORS,
} from '../core/types.js'

const ALL_ADDONS: AddonDefinition[] = [
  drizzleAddon,
  prismaAddon,
  kyselyAddon,
  pinoAddon,
  winstonAddon,
  zodAddon,
  arktypeAddon,
  valibotAddon,
]

const DB_ADDONS = ALL_ADDONS.filter(addon => addon.category === 'database')
const LOGGER_ADDONS = ALL_ADDONS.filter(addon => addon.category === 'logger')
const VALIDATOR_ADDONS = ALL_ADDONS.filter(addon => addon.category === 'validator')

export function getCapabilitiesCatalog(): CapabilitiesCatalog {
  return {
    frameworks: [...FRAMEWORKS],
    db: {
      odms: [...DB_ODMS],
      drivers: [...DB_DRIVERS],
      defaultDriver: DEFAULT_DB_DRIVER,
    },
    loggers: [...LOGGERS],
    validators: [...VALIDATORS],
  }
}

export function resolveAddons(ctx: ScaffoldContext): AddonDefinition[] {
  const selected: AddonDefinition[] = []

  if (ctx.db) {
    const dbAddon = DB_ADDONS.find(addon => addon.id === ctx.db)
    if (!dbAddon) {
      throw new Error(`Unknown database addon "${ctx.db}"`)
    }
    selected.push(dbAddon)
  }

  if (ctx.logger) {
    const loggerAddon = LOGGER_ADDONS.find(addon => addon.id === ctx.logger)
    if (!loggerAddon) {
      throw new Error(`Unknown logger addon "${ctx.logger}"`)
    }
    selected.push(loggerAddon)
  }

  const dbCount = selected.filter(addon => addon.category === 'database').length
  if (dbCount > 1) {
    throw new Error('Only one database addon can be selected')
  }

  const loggerCount = selected.filter(addon => addon.category === 'logger').length
  if (loggerCount > 1) {
    throw new Error('Only one logger addon can be selected')
  }

  if (ctx.validator) {
    const validatorAddon = VALIDATOR_ADDONS.find(addon => addon.id === ctx.validator)
    if (!validatorAddon) {
      throw new Error(`Unknown validator addon "${ctx.validator}"`)
    }
    selected.push(validatorAddon)
  }

  const validatorCount = selected.filter(addon => addon.category === 'validator').length
  if (validatorCount > 1) {
    throw new Error('Only one validator addon can be selected')
  }

  return selected
}

export function collectBootBindings(ctx: ScaffoldContext) {
  return resolveAddons(ctx)
    .map(addon => addon.bootBinding?.(ctx))
    .filter((v): v is NonNullable<typeof v> => Boolean(v))
}
