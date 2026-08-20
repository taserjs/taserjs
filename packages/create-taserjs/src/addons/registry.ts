import { arktypeAddon } from "./arktype/index.js";
import { drizzleAddon } from "./drizzle/index.js";
import { kyselyAddon } from "./kysely/index.js";
import { pinoAddon } from "./pino/index.js";
import { prismaAddon } from "./prisma/index.js";
import { valibotAddon } from "./valibot/index.js";
import { winstonAddon } from "./winston/index.js";
import { zodAddon } from "./zod/index.js";
import type { AddonDefinition } from "./types.js";
import type { CapabilitiesCatalog, ScaffoldContext } from "../core/types.js";
import {
  DB_DRIVERS,
  DB_ODMS,
  DEFAULT_DB_DRIVER,
  LOGGERS,
  PROJECT_TYPES,
  VALIDATORS,
} from "../core/types.js";

const ALL_ADDONS: AddonDefinition[] = [
  drizzleAddon,
  prismaAddon,
  kyselyAddon,
  pinoAddon,
  winstonAddon,
  zodAddon,
  arktypeAddon,
  valibotAddon,
];

const DB_ADDONS = ALL_ADDONS.filter((addon) => addon.category === "database");
const LOGGER_ADDONS = ALL_ADDONS.filter((addon) => addon.category === "logger");
const VALIDATOR_ADDONS = ALL_ADDONS.filter((addon) => addon.category === "validator");

export function getCapabilitiesCatalog(): CapabilitiesCatalog {
  return {
    types: [...PROJECT_TYPES],
    db: {
      odms: [...DB_ODMS],
      drivers: [...DB_DRIVERS],
      defaultDriver: DEFAULT_DB_DRIVER,
    },
    loggers: [...LOGGERS],
    validators: [...VALIDATORS],
  };
}

export function resolveAddons(ctx: ScaffoldContext): AddonDefinition[] {
  const selected: AddonDefinition[] = [];

  if (ctx.db) {
    const dbAddon = DB_ADDONS.find((addon) => addon.id === ctx.db);
    if (!dbAddon) {
      throw new Error(`Unknown database addon "${ctx.db}"`);
    }
    selected.push(dbAddon);
  }

  if (ctx.logger) {
    const loggerAddon = LOGGER_ADDONS.find((addon) => addon.id === ctx.logger);
    if (!loggerAddon) {
      throw new Error(`Unknown logger addon "${ctx.logger}"`);
    }
    selected.push(loggerAddon);
  }

  if (ctx.validator) {
    const validatorAddon = VALIDATOR_ADDONS.find((addon) => addon.id === ctx.validator);
    if (!validatorAddon) {
      throw new Error(`Unknown validator addon "${ctx.validator}"`);
    }
    selected.push(validatorAddon);
  }

  return selected;
}

export function collectBootBindings(ctx: ScaffoldContext) {
  return resolveAddons(ctx)
    .map((addon) => addon.bootBinding?.(ctx))
    .filter((v): v is NonNullable<typeof v> => Boolean(v));
}
