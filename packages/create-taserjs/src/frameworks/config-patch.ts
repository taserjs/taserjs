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

const TAB_INDENTED_LINE = /^\t/m;

// magicast detects a tab-indented file as `tabWidth: 1`, which makes recast multiply the indentation.
function printModule(mod: Module, source: string): string {
  const format = TAB_INDENTED_LINE.test(source) ? { useTabs: true, tabWidth: 4 } : undefined;
  return generateCode(mod, format ? { format } : undefined).code;
}

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

function findConfigObject(mod: Module, label: string): any {
  inlineDefaultExportVariable(mod);
  try {
    return getDefaultExportOptions(mod);
  } catch (error) {
    throw new ConfigPatchError(
      `Cannot find the ${label} config object: ${(error as Error).message}`,
    );
  }
}

// Spread first: iterating the proxied array yields proxies, while `.some` would see raw AST nodes.
const hasPluginCall = (plugins: unknown[], callee: string) =>
  [...plugins].some((plugin: any) => plugin?.$callee === callee);

function requirePluginsArray(config: any): any[] {
  config.plugins ??= [];
  if (!Array.isArray(config.plugins)) {
    throw new ConfigPatchError("The Vite config `plugins` option is not an array literal.");
  }
  return config.plugins;
}

/** Imports `taser` and puts `taser()` first in a Vite `plugins` array, once. */
function addTaserPlugin(
  mod: Module,
  plugins: any[],
  taserOptions: Record<string, unknown> | undefined,
): void {
  if (!isImported(mod, "taser")) {
    mod.imports.$prepend({ from: "@taserjs/plugin/vite", imported: "taser" });
  }
  if (!hasPluginCall(plugins, "taser")) {
    plugins.unshift(builders.functionCall("taser", ...(taserOptions ? [taserOptions] : [])));
  }
}

/** Adds `taser()` (first) and optionally `nitro()` (last) to a Vite config's `plugins` array. */
export function patchViteConfig(source: string, { taserOptions, nitro }: VitePatch): string {
  const mod = parseModule(source);
  const plugins = requirePluginsArray(findConfigObject(mod, "Vite"));

  addTaserPlugin(mod, plugins, taserOptions);

  if (nitro) {
    if (!isImported(mod, "nitro")) mod.imports.$prepend({ from: "nitro/vite", imported: "nitro" });
    if (!hasPluginCall(plugins, "nitro")) {
      plugins.push(builders.functionCall("nitro"));
    }
  }

  return printModule(mod, source);
}

/**
 * Adds `taser()` to the `vite.plugins` option of a `nuxt.config`, which Nuxt hands to its own Vite.
 * Nuxt 4 runs Vite with the `app/` directory as its root, so Taser.js is pinned to the project root, as `createTaser()` is for Next.js.
 */
export function patchNuxtConfig(source: string): string {
  const mod = parseModule(source);
  const config = findConfigObject(mod, "Nuxt");

  config.vite ??= {};
  addTaserPlugin(mod, requirePluginsArray(config.vite), {
    cwd: builders.raw("process.cwd()"),
  });

  return printModule(mod, source);
}

const REACT_ROUTER_API_PATH = "api/*";
const REACT_ROUTER_API_FILE = "routes/api.ts";

/** Registers the `api/*` resource route in a React Router `app/routes.ts`. */
export function patchReactRouterRoutes(source: string): string {
  const mod = parseModule(source);
  const routes = mod.exports.default;
  if (!Array.isArray(routes)) {
    throw new ConfigPatchError("The React Router routes file does not export a route array.");
  }

  const isApiRoute = (entry: any) =>
    entry?.$callee === "route" && entry.$args?.[0] === REACT_ROUTER_API_PATH;
  if ([...routes].some(isApiRoute)) return source;

  if (!isImported(mod, "route")) {
    mod.imports.$prepend({ from: "@react-router/dev/routes", imported: "route" });
  }
  routes.push(builders.functionCall("route", REACT_ROUTER_API_PATH, REACT_ROUTER_API_FILE));

  return printModule(mod, source);
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

  return printModule(mod, source);
}
