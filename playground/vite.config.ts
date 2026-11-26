import { readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { dirname, join, normalize, resolve } from "pathe";
import { defineConfig, type Plugin } from "vite";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PLAYGROUND = dirname(fileURLToPath(import.meta.url));
const MONACO = join(PLAYGROUND, "node_modules", "monaco-editor");

// Monaco's package `exports` map is restrictive, so bundler-worker specifiers
// (`…worker.js?worker`) fail exports resolution in rolldown. Alias each of
// them to the concrete file (query appended) so the worker plugin bundles it.
const monacoWorkerAliases: { find: string; replacement: string }[] = [
  "esm/vs/editor/editor.worker.js",
  "esm/vs/language/typescript/ts.worker.js",
  "esm/vs/language/json/json.worker.js",
  "esm/vs/language/css/css.worker.js",
  "esm/vs/language/html/html.worker.js",
].map((subpath) => ({
  find: `monaco-editor/${subpath}?worker`,
  replacement: `${join(MONACO, subpath)}?worker`,
}));

interface PkgSpec {
  /** Name as taserjs files import it. */
  name: string;
  /** Directory to search .d.ts files from. */
  root: string;
  /** Subdirectory containing the .d.ts files. */
  dir: string;
  /** Path to the type entry point, as written in the stub package.json. */
  types: string;
}

// Workspace packages resolve straight from the repo; nested dependencies are
// resolved relative to the package that imports them.
function pkg(specifier: string, fromDir: string): string {
  // Resolve via the package's "." entry (its exports map may not expose ./package.json),
  // then walk up to the directory that actually is the package root.
  const leaf = specifier.replace(/^@[^/]+\//, "");
  let dir = normalize(dirname(createRequire(join(fromDir, "noop.js")).resolve(specifier)));
  while (dir.split("/").pop() !== leaf && dir !== dirname(dir)) dir = dirname(dir);
  return dir;
}

const RUNTIME_DIR = resolve(REPO, "packages", "runtime");

const SPECS: PkgSpec[] = [
  ...["runtime", "router", "client", "utils"].map((leaf): PkgSpec => {
    const root = resolve(REPO, "packages", leaf);
    const real = JSON.parse(readFileSync(join(root, "package.json"), "utf-8")) as {
      types?: string;
    };
    return {
      name: `@taserjs/${leaf}`,
      root,
      dir: "dist",
      types: (real.types ?? "./dist/index.d.ts").replace("./dist/", "./"),
    };
  }),
  {
    name: "hono",
    root: pkg("hono", RUNTIME_DIR),
    dir: join("dist", "types"),
    types: "./index.d.ts",
  },
  {
    name: "@standard-schema/spec",
    root: pkg("@standard-schema/spec", resolve(REPO, "packages", "router")),
    dir: ".",
    types: "./dist/index.d.ts",
  },
  {
    name: "zod",
    root: pkg("zod", resolve(REPO, "playground")),
    dir: ".",
    types: "./index.d.ts",
  },
];

function collectDts(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const spec of SPECS) {
    const prefix = `node_modules/${spec.name}/`;
    out[`${prefix}package.json`] = JSON.stringify({ name: spec.name, types: spec.types });
    const dir = join(spec.root, spec.dir);
    for (const file of dtsFiles(dir)) {
      const virtualRel = normalize(file)
        .slice(dir.length + 1)
        .replace(/^dist\//, "");
      out[`${prefix}${virtualRel}`] = readFileSync(file, "utf-8");
    }
  }
  return out;
}

function dtsFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...dtsFiles(full));
    else if (full.endsWith(".d.ts")) files.push(full);
  }
  return files;
}

/** Exposes the collected declaration files as `virtual:taser-dts` (Record<virtualPath, content>). */
function taserTypesPlugin(): Plugin {
  return {
    name: "taser-dts",
    resolveId(id) {
      if (id === "virtual:taser-dts") return id;
    },
    load(id) {
      if (id !== "virtual:taser-dts") return;
      return `export default ${JSON.stringify(collectDts())};`;
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [tailwindcss(), react(), taserTypesPlugin()],
  resolve: {
    alias: monacoWorkerAliases,
  },
  // The monaco worker entries must not be pre-bundled: the optimizer emits
  // plain ESM chunks without the `?worker` default export (a Worker
  // constructor), which then fails import analysis in the dev server.
  optimizeDeps: {
    exclude: monacoWorkerAliases.map((entry) => entry.find),
  },
});
