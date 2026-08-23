import type { Nitro, NitroModule } from "nitro/types";
import { existsSync } from "node:fs";
import { resolve } from "pathe";
import { DEFAULT_IGNORE } from "@taserjs/router-generator";
import type { TaserNitroOptions } from "./types.js";
import {
  createTaserVirtualContext,
  resolveRoutesDir,
  VIRTUAL_MANIFEST_ID,
  VIRTUAL_ENTRY_ID,
} from "./virtual.js";
import { watchRoutesDir } from "./routes-watcher.js";
import { applyRouteBatch } from "./batch.js";

export function findHostServerEntry(rootDir: string): string | undefined {
  const candidates = [
    "src/server.node.ts",
    "src/server.node.js",
    "server.node.ts",
    "server.node.js",
    "src/server.ts",
    "src/server.js",
    "src/server.mjs",
    "server.ts",
    "server.js",
    "server.mjs",
  ];
  for (const candidate of candidates) {
    const fullPath = resolve(rootDir, candidate);
    if (existsSync(fullPath)) {
      return fullPath;
    }
  }
  return undefined;
}

function getVirtualAppCode(rootDir: string, nitro: Nitro, scope: string = "/"): string {
  const hostServer = findHostServerEntry(rootDir);
  const extraHandlers = (nitro.options.handlers || []).filter(
    (h) => h.handler !== VIRTUAL_ENTRY_ID,
  );

  const cleanScope = scope.replace(/\/$/, "");
  const scopeCondition =
    scope === "/" || cleanScope === ""
      ? "true"
      : `url.pathname === "${cleanScope}" || url.pathname.startsWith("${cleanScope}/")`;

  if (!hostServer && extraHandlers.length === 0) {
    return `import entry from "${VIRTUAL_ENTRY_ID}";

export function createNitroApp() {
  return {
    fetch: (req) => {
      const url = new URL(req.url);
      if (${scopeCondition}) {
        return entry(req);
      }
      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { "content-type": "application/json" }
      });
    },
    captureError: (error) => console.error(error),
  };
}

export function initNitroPlugins() {}
`;
  }

  const imports: string[] = [`import taserEntry from "${VIRTUAL_ENTRY_ID}";`];
  let hostInvocation = "";

  if (hostServer) {
    imports.push(`import hostServer from "${hostServer}";`);
    hostInvocation = `
    const hostFetch = typeof hostServer === "function"
      ? hostServer
      : hostServer?.fetch || hostServer?.default?.fetch || hostServer?.default;
    if (typeof hostFetch === "function") {
      const hostRes = await hostFetch(req);
      if (hostRes !== undefined) return hostRes;
    }
`;
  }

  extraHandlers.forEach((h, i) => {
    imports.push(`import handler${i} from "${h.handler}";`);
  });

  const extraInvocations = extraHandlers
    .map(
      (h, i) => `
    const h${i}Fetch = typeof handler${i} === "function"
      ? handler${i}
      : handler${i}?.fetch || handler${i}?.default?.fetch || handler${i}?.default;
    if (typeof h${i}Fetch === "function") {
      const res${i} = await h${i}Fetch(req);
      if (res${i} !== undefined) return res${i};
    }
`,
    )
    .join("\n");

  return `${imports.join("\n")}

export function createNitroApp() {
  const fetchHandler = async (req) => {
    const url = new URL(req.url);
    if (${scopeCondition}) {
      const res = await taserEntry(req);
      if (res !== undefined) {
        return res;
      }
    }
${hostInvocation}
${extraInvocations}
    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: { "content-type": "application/json" }
    });
  };

  return {
    fetch: fetchHandler,
    captureError: (error) => console.error(error),
  };
}

export function initNitroPlugins() {}
`;
}

export function taserNitro(options: TaserNitroOptions = {}): NitroModule {
  return {
    name: "taser-nitro",
    setup(nitro: Nitro) {
      const rootDir = resolve(nitro.options.rootDir || ".");
      const explicitRoutes = nitro.options.routesDir as string | undefined;
      const routesDir = explicitRoutes
        ? resolve(rootDir, explicitRoutes)
        : resolveRoutesDir(rootDir);

      const nitroIgnore = (nitro.options.ignore || []) as string[];
      const ignore = Array.from(new Set([...nitroIgnore, ...DEFAULT_IGNORE]));
      nitro.options.ignore = ignore;

      const nitroTaserConfig = ((nitro.options as any).taser || {}) as TaserNitroOptions;
      const mergedTaserOptions: TaserNitroOptions = {
        ...nitroTaserConfig,
        ...options,
      };

      const ctx = createTaserVirtualContext({
        rootDir,
        routesDir,
        ignore,
        ...mergedTaserOptions,
      });

      // 1. Disable Nitro built-in route scanner — file routing belongs to taser
      nitro.options.routesDir = "";
      nitro.options.apiDir = "";
      nitro.options.scanDirs = [];
      nitro.options.serverDir = false;

      const scope = mergedTaserOptions.basePath || "/";

      // 2. Register virtual modules in Nitro options
      nitro.options.virtual = nitro.options.virtual || {};
      nitro.options.virtual[VIRTUAL_MANIFEST_ID] = () => ctx.getManifestCode();
      nitro.options.virtual[VIRTUAL_ENTRY_ID] = () => ctx.getEntryCode();
      nitro.options.virtual["#nitro/virtual/app"] = () => getVirtualAppCode(rootDir, nitro, scope);
      nitro.options.virtual["#nitro/virtual/routing"] = () =>
        "export const findRouteRules = () => ({}); export const findRoute = () => undefined; export const globalMiddleware = []; export const findRoutedMiddleware = () => [];";

      // 3. Register Taser Route Handler in Nitro handlers
      const routePattern = scope === "/" ? "/**" : `${scope.replace(/\/$/, "")}/**`;

      nitro.options.handlers.unshift({
        route: routePattern,
        lazy: false,
        handler: VIRTUAL_ENTRY_ID,
      });

      // 4. Hook into type generation
      nitro.hooks.hook("types:extend", async () => {
        await ctx.writeTypes();
      });

      // 5. Invalidate the analysis/model caches on dev reloads
      nitro.hooks.hook("dev:reload", () => {
        ctx.invalidate();
      });

      let closeWatcher: (() => Promise<void>) | undefined;

      // 6. Dev watcher: one shared chokidar instance (never double-watches),
      //    debounced batches → scaffold adds → invalidate → types → reload
      if (nitro.options.dev && existsSync(ctx.routesDir)) {
        const watcher = watchRoutesDir(ctx.routesDir, { ignore }, async (batch) => {
          await applyRouteBatch(ctx, batch);
          await nitro.hooks.callHook("rollup:reload");
        });
        closeWatcher = watcher.close;
      }

      nitro.hooks.hook("close", async () => {
        await closeWatcher?.();
      });
    },
  };
}
