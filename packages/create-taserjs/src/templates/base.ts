import type { BootBinding } from "../addons/types.js";
import type { ScaffoldContext } from "../core/types.js";

export function packageJsonTemplate(
  projectName: string,
  scripts: Record<string, string> = {},
): string {
  const pkg = {
    name: projectName,
    version: "1.0.0",
    private: true,
    type: "module",
    imports: {
      "#taserjs/router": "./src/taser.ts",
    },
    scripts: {
      dev: "vite",
      build: "vite build",
      typecheck: "tsc --noEmit -p tsconfig.json",
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
        paths: {
          "#taserjs/router": ["./src/taser.ts"],
        },
        strict: true,
        skipLibCheck: true,
        verbatimModuleSyntax: true,
        isolatedModules: true,
        noEmit: true,
      },
      include: ["src", ".taser/types/**/*.d.ts"],
    },
    null,
    2,
  )}\n`;
}

export function gitignoreTemplate(): string {
  return `node_modules
dist
.output
.taser
.DS_Store
*.log
.env
local.db
drizzle
`;
}

export function contextTemplate(bindings: BootBinding[]): string {
  const imports = bindings.map(
    (binding) => `import { ${binding.factoryName} } from '${binding.importPath}'`,
  );

  const bootBody =
    bindings.length > 0
      ? bindings.map((binding) => `    ${binding.key}: ${binding.factoryName}(),`).join("\n")
      : "";

  const bootBlock = bindings.length > 0 ? `  boot: () => ({\n${bootBody}\n  }),` : "";

  const importBlock = imports.length > 0 ? `${imports.join("\n")}\n\n` : "";

  return `${importBlock}import { createContext } from '@taserjs/router'

export const context = createContext({
${bootBlock}
  request: () => ({
    requestId: crypto.randomUUID(),
  }),
})
`;
}

export function rootLayoutTemplate(): string {
  return `import { cors } from '@taserjs/router/cors'

import { t } from '#taserjs/router'

export const Middleware = t.middleware('/$')
  .use(cors())
`;
}

export function indexRouteTemplate(): string {
  return `import { json } from '@taserjs/router/reply'
import { t } from '#taserjs/router'

const GET = t.get('/')

export type RouteContext = typeof GET.$Infer.Context
export const Route = GET.handler((_ctx) => {
  return json({ message: 'Welcome to Taser' })
})
`;
}

export function healthRouteTemplate(ctx: ScaffoldContext): string {
  const lines: string[] = [];

  if (ctx.logger) {
    lines.push("  ctx.logger.info('health check')");
  }

  if (ctx.db) {
    lines.push("  // ctx.db is available from context boot");
  }

  const body = lines.length > 0 ? `${lines.join("\n")}\n` : "";
  const ctxArg = lines.length > 0 ? "(ctx)" : "(_ctx)";

  return `import { json } from '@taserjs/router/reply'
import { t } from '#taserjs/router'

const GET = t.get('/health')

export type RouteContext = typeof GET.$Infer.Context
export const Route = GET.handler(${ctxArg} => {
${body}  return json({ ok: true })
})
`;
}
