import { builders, generateCode, parseModule } from "magicast";
import { getDefaultExportOptions } from "magicast/helpers";

/** Raised when a generated config has a shape the codemods do not recognise. */
export class ConfigPatchError extends Error {}

export interface VitePatch {
  /** Options passed to `taser(...)`. */
  taserOptions?: Record<string, unknown> | undefined;
  /** Adds `nitro()` after the framework plugins. */
  nitro: boolean;
}

type Module = ReturnType<typeof parseModule>;

const isImported = (mod: Module, local: string) => Object.keys(mod.imports).includes(local);

/**
 * Rewrites `const config = defineConfig({...}); export default config;` into
 * `export default defineConfig({...});` so the config object can be edited in place.
 */
function inlineDefaultExportVariable(mod: Module): void {
  const body = (mod.$ast as any).body as any[];
  const exportDefault = body.find((node) => node.type === "ExportDefaultDeclaration");
  if (exportDefault?.declaration?.type !== "Identifier") return;

  const name = exportDefault.declaration.name;
  const index = body.findIndex(
    (node) =>
      node.type === "VariableDeclaration" &&
      node.declarations.length === 1 &&
      node.declarations[0].id?.name === name &&
      node.declarations[0].init,
  );
  if (index === -1) return;

  exportDefault.declaration = body[index].declarations[0].init;
  body.splice(index, 1);
}

function findViteConfigObject(mod: Module): any {
  inlineDefaultExportVariable(mod);
  try {
    return getDefaultExportOptions(mod);
  } catch (error) {
    throw new ConfigPatchError(`Cannot find the Vite config object: ${(error as Error).message}`);
  }
}

// Spread first: iterating the proxied array yields proxies, while `.some` would see raw AST nodes.
const hasPluginCall = (plugins: unknown[], callee: string) =>
  [...plugins].some((plugin: any) => plugin?.$callee === callee);

/** Adds `taser()` (first) and optionally `nitro()` (last) to a Vite config's `plugins` array. */
export function patchViteConfig(source: string, { taserOptions, nitro }: VitePatch): string {
  const mod = parseModule(source);
  const config = findViteConfigObject(mod);

  config.plugins ??= [];
  const plugins = config.plugins;
  if (!Array.isArray(plugins)) {
    throw new ConfigPatchError("The Vite config `plugins` option is not an array literal.");
  }

  if (!isImported(mod, "taser")) {
    mod.imports.$prepend({ from: "@taserjs/plugin/vite", imported: "taser" });
  }
  if (!hasPluginCall(plugins, "taser")) {
    plugins.unshift(builders.functionCall("taser", ...(taserOptions ? [taserOptions] : [])));
  }

  if (nitro) {
    if (!isImported(mod, "nitro")) mod.imports.$prepend({ from: "nitro/vite", imported: "nitro" });
    if (!hasPluginCall(plugins, "nitro")) {
      plugins.push(builders.functionCall("nitro"));
    }
  }

  return generateCode(mod).code;
}

/** Wraps the default export of a `next.config` with `createTaser()(...)`. */
export function patchNextConfig(source: string): string {
  const mod = parseModule(source);

  const exportDefault = (mod.$ast as any).body.find(
    (node: any) => node.type === "ExportDefaultDeclaration",
  );
  if (!exportDefault) {
    throw new ConfigPatchError("The Next.js config has no default export.");
  }
  if (isImported(mod, "createTaser")) return source;

  mod.imports.$prepend({ from: "@taserjs/plugin/next", imported: "createTaser" });
  exportDefault.declaration = {
    type: "CallExpression",
    callee: {
      type: "CallExpression",
      callee: { type: "Identifier", name: "createTaser" },
      arguments: [],
    },
    arguments: [exportDefault.declaration],
  };

  return generateCode(mod).code;
}
