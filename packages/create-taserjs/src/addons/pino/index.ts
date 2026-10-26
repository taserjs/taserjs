import type { AddonDefinition } from "../types.js";

export const pinoAddon: AddonDefinition = {
  id: "pino",
  category: "logger",
  dependencies() {
    return ["pino"];
  },
  devDependencies() {
    return [];
  },
  bootBinding() {
    return {
      key: "logger",
      importPath: "./logger.js",
      factoryName: "createLogger",
    };
  },
  async apply(ctx, write) {
    await write(
      `${ctx.serverDir}/logger.ts`,
      `import pino from "pino";

export function createLogger() {
  return pino({ level: process.env.LOG_LEVEL ?? "info" });
}
`,
    );
  },
};
