import { mkdirSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { DEFAULT_CONFIG, resolveRoutesDir, type ResolvedTaserConfig } from "./config.js";
import { generateManifest } from "./generator.js";
import { scanRoutes } from "./scanner.js";

export type TemplateVariant = "ts" | "tsx";

export interface PackageVersions {
  cli?: string;
  plugin?: string;
  router?: string;
  runtime?: string;
  hono?: string;
  honoNodeServer?: string;
  vite?: string;
  typescript?: string;
}

export interface ScaffoldOptions {
  targetDir: string;
  projectName?: string | undefined;
  template?: TemplateVariant | undefined;
  packageVersions?: PackageVersions | undefined;
  generateInitialManifest?: boolean | undefined;
}

export interface ScaffoldResult {
  targetDir: string;
  projectName: string;
  template: TemplateVariant;
  files: string[];
}

const DEFAULT_VERSIONS: Required<PackageVersions> = {
  cli: "^0.0.1",
  plugin: "^0.0.1",
  router: "^0.0.1",
  runtime: "^0.0.1",
  hono: "^4.10.3",
  honoNodeServer: "^1.13.8",
  vite: "^6.2.0",
  typescript: "^5.9.3",
};

export function scaffoldProject(options: ScaffoldOptions): ScaffoldResult {
  const targetDir = resolve(options.targetDir);
  const projectName = options.projectName ?? basename(targetDir);
  const template: TemplateVariant = options.template ?? "ts";
  const versions: Required<PackageVersions> = {
    ...DEFAULT_VERSIONS,
    ...options.packageVersions,
  };

  mkdirSync(targetDir, { recursive: true });
  mkdirSync(resolve(targetDir, "src", "routes"), { recursive: true });

  const writtenFiles: string[] = [];

  const writeFile = (relativePath: string, content: string) => {
    const fullPath = resolve(targetDir, relativePath);
    writeFileSync(fullPath, content.trimStart(), "utf-8");
    writtenFiles.push(relativePath);
  };

  // 1. package.json
  const packageJson = {
    name: projectName,
    version: "0.0.1",
    type: "module",
    scripts: {
      dev: "vite",
      build: "vite build",
      start: "node dist/server.js",
    },
    dependencies: {
      "@hono/node-server": versions.honoNodeServer,
      "@taserjs/router": versions.router,
      "@taserjs/runtime": versions.runtime,
      hono: versions.hono,
    },
    devDependencies: {
      "@taserjs/cli": versions.cli,
      "@taserjs/plugin": versions.plugin,
      typescript: versions.typescript,
      vite: versions.vite,
    },
  };
  writeFile("package.json", JSON.stringify(packageJson, null, 2) + "\n");

  // 2. tsconfig.json
  const tsConfig: Record<string, unknown> = {
    compilerOptions: {
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      strict: true,
      skipLibCheck: true,
      esModuleInterop: true,
      ...(template === "tsx"
        ? {
            jsx: "react-jsx",
            jsxImportSource: "hono/jsx",
          }
        : {}),
    },
    include: ["src/**/*", "taserjs.config.ts", "vite.config.ts"],
  };
  writeFile("tsconfig.json", JSON.stringify(tsConfig, null, 2) + "\n");

  // 3. taserjs.config.ts
  writeFile(
    "taserjs.config.ts",
    `import { defineConfig } from "@taserjs/cli";

export default defineConfig({
  serverDir: "src",
  routesDir: "routes",
  outputDir: ".taserjs",
  app: "taser.ts",
});
`,
  );

  // 4. vite.config.ts
  writeFile(
    "vite.config.ts",
    `import { defineConfig } from "vite";
import { taser } from "@taserjs/plugin/vite";

export default defineConfig({
  plugins: [taser()],
  build: {
    target: "esnext",
    ssr: "src/server.ts",
    outDir: "dist",
  },
});
`,
  );

  // 5. .gitignore
  writeFile(
    ".gitignore",
    `node_modules/
dist/
.taserjs/
.env
.env.*
!.env.example
`,
  );

  // 6. src/taser.ts
  writeFile(
    "src/taser.ts",
    `import { defineTaser } from "@taserjs/router";

export default defineTaser();
`,
  );

  // 7. src/server.ts
  writeFile(
    "src/server.ts",
    `import { serve } from "@hono/node-server";
import { createTaserApp } from "@taserjs/runtime";
import { routeManifest } from "./.taserjs/routes.gen.js";
import taser from "./taser.js";

export const app = createTaserApp(routeManifest, taser);

const port = Number(process.env.PORT) || 3000;

if (process.env.NODE_ENV !== "test") {
  console.log(\`Server running at http://localhost:\${port}\`);
  serve({
    fetch: app.fetch,
    port,
  });
}

export default app;
`,
  );

  // 8. Sample routes
  const ext = template === "tsx" ? "tsx" : "ts";
  const indexRouteContent =
    template === "tsx"
      ? `import { t } from "@taserjs/router";

export default t.get("/").handler(() => {
  return new Response("<h1>Welcome to Taser.js!</h1>", {
    headers: { "content-type": "text/html" },
  });
});
`
      : `import { t } from "@taserjs/router";

export default t.get("/").handler(() => {
  return Response.json({ message: "Welcome to Taser.js!" });
});
`;

  writeFile(`src/routes/index.get.${ext}`, indexRouteContent);

  const rootLayoutContent = `import { t } from "@taserjs/router";

export default t.layout("/*").use(async (_args, next) => {
  return await next();
});
`;
  writeFile(`src/routes/$.${ext}`, rootLayoutContent);

  // 9. Initial manifest generation (optional, default true)
  if (options.generateInitialManifest !== false) {
    const config: ResolvedTaserConfig = {
      ...DEFAULT_CONFIG,
      serverDir: "src",
      routesDir: "routes",
      outputDir: ".taserjs",
      app: "taser.ts",
    };
    const fullRoutesDir = resolveRoutesDir(config, targetDir);
    const scanResult = scanRoutes({
      routesDir: fullRoutesDir,
      cwd: targetDir,
      extensions: config.extensions,
    });
    generateManifest(scanResult, config, targetDir);
    writtenFiles.push("src/.taserjs/routes.gen.ts");
  }

  return {
    targetDir,
    projectName,
    template,
    files: writtenFiles,
  };
}
