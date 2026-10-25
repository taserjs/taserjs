import type { AddonDefinition } from "../types.js";

export const winstonAddon: AddonDefinition = {
  id: "winston",
  category: "logger",
  dependencies() {
    return ["winston"];
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
      `import winston from "winston";

export function createLogger() {
  return winston.createLogger({
    level: process.env.LOG_LEVEL ?? "info",
    format: winston.format.json(),
    transports: [new winston.transports.Console()],
  });
}
`,
    );
  },
};
