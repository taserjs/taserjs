import { drizzleAddon } from "./drizzle/index.js";
import { kyselyAddon } from "./kysely/index.js";
import { pinoAddon } from "./pino/index.js";
import { prismaAddon } from "./prisma/index.js";
import type { AddonDefinition, BootBinding } from "./types.js";
import { ValidatorAddon } from "./validators.js";
import { winstonAddon } from "./winston/index.js";
import type { ScaffoldContext } from "../core/types.js";

export const ADDONS: Record<string, AddonDefinition> = {
  drizzle: drizzleAddon,
  prisma: prismaAddon,
  kysely: kyselyAddon,
  pino: pinoAddon,
  winston: winstonAddon,
  zod: ValidatorAddon("zod"),
  arktype: ValidatorAddon("arktype"),
  valibot: ValidatorAddon("valibot"),
};

export function resolveAddons(ctx: ScaffoldContext): AddonDefinition[] {
  const result: AddonDefinition[] = [];
  if (ctx.db && ADDONS[ctx.db]) {
    const addon = ADDONS[ctx.db];
    if (addon) result.push(addon);
  }
  if (ctx.logger && ADDONS[ctx.logger]) {
    const addon = ADDONS[ctx.logger];
    if (addon) result.push(addon);
  }
  if (ctx.validator && ADDONS[ctx.validator]) {
    const addon = ADDONS[ctx.validator];
    if (addon) result.push(addon);
  }
  return result;
}

export function collectBootBindings(ctx: ScaffoldContext): BootBinding[] {
  const addons = resolveAddons(ctx);
  const bindings: BootBinding[] = [];
  for (const addon of addons) {
    if (addon.bootBinding) {
      const binding = addon.bootBinding(ctx);
      if (binding) {
        bindings.push(binding);
      }
    }
  }
  return bindings;
}
