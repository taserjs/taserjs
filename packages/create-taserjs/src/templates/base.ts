import type { BootBinding } from "../addons/types.js";

export function packageJsonTemplate(
  projectName: string,
  scripts: Record<string, string> = {},
): string {
  const pkg = {
    name: projectName,
    version: "0.0.1",
    private: true,
    type: "module",
    scripts: {
      dev: "vite",
      build: "vite build",
      start: "node dist/serve.mjs",
      ...scripts,
    },
  };

  return `${JSON.stringify(pkg, null, 2)}\n`;
}

export function tsconfigTemplate(): string {
  return `${JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        strict: true,
        skipLibCheck: true,
        esModuleInterop: true,
      },
      include: [
        "src/**/*",
        "src/.taserjs/**/*",
        "taserjs.config.ts",
        "vite.config.ts",
        "nitro.config.ts",
      ],
    },
    null,
    2,
  )}\n`;
}

export function gitignoreTemplate(): string {
  return `node_modules/
dist/
.output/
.taserjs/
.env
.env.*
!.env.example
*.log
local.db
drizzle/
`;
}

export function taserConfigTemplate(): string {
  return `import { defineConfig } from "@taserjs/cli";

export default defineConfig({
  serverDir: "src",
  routesDir: "routes",
  outputDir: ".taserjs",
  app: "taser.ts",
});
`;
}

export function viteConfigTemplate(preset: string = "none"): string {
  if (preset === "none") {
    return `import { defineConfig } from "vite";
import { taser } from "@taserjs/plugin/vite";

export default defineConfig({
  plugins: [taser()],
});
`;
  }

  return `import { defineConfig } from "vite";
import { nitro } from "nitro/vite";
import { taser } from "@taserjs/plugin/vite";

export default defineConfig({
  plugins: [taser(), nitro()],
});
`;
}

export function nitroConfigTemplate(preset: string): string {
  return `import { defineConfig } from "nitro/config";
import { taser } from "@taserjs/plugin/nitro";

export default defineConfig({
  preset: "${preset}",
  modules: [taser({ standalone: true })],
});
`;
}

export function contextTemplate(bindings: BootBinding[]): string {
  const imports = bindings.map((b) => `import { ${b.factoryName} } from "${b.importPath}";`);

  const bootBody =
    bindings.length > 0 ? bindings.map((b) => `    ${b.key}: ${b.factoryName}(),`).join("\n") : "";

  const bootBlock = bindings.length > 0 ? `  boot: () => ({\n${bootBody}\n  }),\n` : "";
  const importBlock = imports.length > 0 ? `${imports.join("\n")}\n\n` : "";

  return `${importBlock}import { createContext } from "@taserjs/router";

export const context = createContext({
${bootBlock}  request: () => ({
    requestId: crypto.randomUUID(),
  }),
});
`;
}

export function taserTsTemplate(): string {
  return `import { defineTaser } from "@taserjs/router";
import { context } from "./context.js";

export default defineTaser().context(context);
`;
}

export function rootLayoutTemplate(): string {
  return `import { t } from "@taserjs/router";

export default t.layout("/*").use(async (_args, next) => {
  return await next();
});
`;
}

export function indexRouteTemplate(): string {
  return `import { t } from "@taserjs/router";

export default t.get("/").handler(() => {
  return Response.json({ message: "Welcome to Taser.js!" });
});
`;
}

export function staticRoutesGenTemplate(): string {
  return `// @ts-nocheck
import { createTaserApp } from "@taserjs/runtime";
import taser from "../taser.js";
import layout_0 from "../routes/$.js";
import route_0 from "../routes/index.get.js";

export type LayoutTree = {
  "/*": typeof layout_0;
};

export const layoutManifest = {
  "/*": layout_0,
} as const;

export const routeManifest = {
  layouts: layoutManifest,
  routes: {
    "/": {
      GET: {
        layouts: ["/*"],
        route: route_0,
      },
    },
  },
} as const;

export type RouteManifest = typeof routeManifest;

export const app = createTaserApp(routeManifest, taser);
export default app;
export const createApp = (overrideTaser?: typeof taser) =>
  createTaserApp(routeManifest, overrideTaser ?? taser);

export type RoutePath = "/";

export type LayoutHierarchy = {
  "/*": readonly [];
};

export type RouteByPathMethod = {
  "/": {
    GET: {
      layouts: readonly ["/*"];
    };
  };
};

export type AppContext = typeof taser.$Infer.Context;

declare module "@taserjs/router" {
  interface RouterRegister {
    RoutePath: RoutePath;
    LayoutTree: LayoutTree;
    LayoutHierarchy: LayoutHierarchy;
    RouteByPathMethod: RouteByPathMethod;
    AppContext: AppContext;
  }
}
`;
}
