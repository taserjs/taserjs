import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, posix } from "node:path";

import { collectBootBindings, resolveAddons } from "../addons/registry.js";
import type { ConfigPatch } from "../frameworks/types.js";
import { getHost } from "../hosts/registry.js";
import { HOST_FILE_NAMES } from "../hosts/types.js";
import {
  apiClientTemplate,
  contextTemplate,
  gitignoreTemplate,
  indexRouteTemplate,
  nitroConfigTemplate,
  packageJsonTemplate,
  rootLayoutTemplate,
  staticRoutesGenTemplate,
  taserConfigTemplate,
  taserTsTemplate,
  tsconfigTemplate,
  viteConfigTemplate,
} from "../templates/base.js";
import {
  packageManagerName,
  resolveGeneratorCommand,
  resolveUserAgent,
  runGenerator,
} from "./package-manager.js";
import { isBare, startScriptFor } from "./presets.js";
import { resolveScaffold } from "./resolve.js";
import type { ResolvedScaffold, ScaffoldOptions, ScaffoldResult } from "./types.js";

const UI_API_BASE_PATH = "/api";
const UI_CLIENT_FILE = "src/api.ts";
const NEXT_BROWSER_API_URL = "http://localhost:3000/api";

const RELATIVE_JS_IMPORT = /(from\s+"\.{1,2}\/[^"]*)\.js"/g;

/** Templates import with `.js`; extensionless frameworks get the same files without it. */
const withoutJsExtensions = (source: string) => source.replace(RELATIVE_JS_IMPORT, '$1"');

async function write(filePath: string, contents: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, contents.trimStart(), "utf-8");
}

const NITRO_GITIGNORE_ENTRIES = [".output", ".nitro"];

async function ignoreNitroOutput(root: string): Promise<void> {
  const file = join(root, ".gitignore");
  const current = existsSync(file) ? await readFile(file, "utf-8") : "";
  const present = new Set(current.split(/\r?\n/).map((line) => line.replace(/\/$/, "")));
  const missing = NITRO_GITIGNORE_ENTRIES.filter((entry) => !present.has(entry));
  if (missing.length === 0) return;

  const separator = current === "" || current.endsWith("\n") ? "" : "\n";
  await writeFile(file, `${current}${separator}${missing.join("\n")}\n`, "utf-8");
}

async function mergeScripts(root: string, scripts: Record<string, string>): Promise<void> {
  if (Object.keys(scripts).length === 0) return;
  const file = join(root, "package.json");
  const pkg = JSON.parse(await readFile(file, "utf-8"));
  // Scripts the framework already defines (for example `start`) win over ours.
  pkg.scripts = { ...scripts, ...pkg.scripts };
  await writeFile(file, `${JSON.stringify(pkg, null, 2)}\n`, "utf-8");
}

/** Applies a codemod to the first matching config file; reports a manual step when it cannot. */
async function patchConfig(
  root: string,
  config: ConfigPatch,
  manualSteps: string[],
): Promise<void> {
  const fileName = config.candidates.find((candidate) => existsSync(join(root, candidate)));
  if (!fileName) {
    manualSteps.push(config.manualStep);
    return;
  }

  const file = join(root, fileName);
  try {
    await writeFile(file, config.patch(await readFile(file, "utf-8")), "utf-8");
  } catch {
    manualSteps.push(`${fileName}: ${config.manualStep}`);
  }
}

function clientBaseUrl(scaffold: ResolvedScaffold): string {
  return scaffold.framework === "nextjs" ? NEXT_BROWSER_API_URL : UI_API_BASE_PATH;
}

export async function scaffoldProject(options: ScaffoldOptions): Promise<ScaffoldResult> {
  const { scaffold, framework } = resolveScaffold(options);
  const root = options.targetDir;
  const isApiOnly = framework.group === "api";
  const nitro = !isBare(scaffold.preset);
  const agent = options.agent ?? resolveUserAgent();

  const writtenFiles: string[] = [];
  const manualSteps: string[] = [];
  const trackedWrite = async (relPath: string, contents: string) => {
    const isSource = framework.extensionlessImports && relPath.endsWith(".ts");
    await write(join(root, relPath), isSource ? withoutJsExtensions(contents) : contents);
    writtenFiles.push(relPath);
  };

  if (framework.generator) {
    await mkdir(dirname(root), { recursive: true });
    const generate = framework.generator({
      projectName: basename(root),
      packageManager: packageManagerName(agent),
    });
    const { command, args } = resolveGeneratorCommand(agent, generate);
    await (options.generator ?? runGenerator)({ command, args, cwd: dirname(root) });
  }

  const addons = resolveAddons(scaffold);
  const scripts: Record<string, string> = {};
  const host = getHost(scaffold.host);
  const dependencies = [...framework.dependencies, ...(host?.dependencies ?? [])];
  const devDependencies = [
    ...framework.devDependencies,
    ...(nitro ? ["nitro"] : []),
    ...(host?.devDependencies ?? []),
  ];

  for (const addon of addons) {
    dependencies.push(...addon.dependencies(scaffold));
    devDependencies.push(...addon.devDependencies(scaffold));
    Object.assign(scripts, addon.scripts?.(scaffold));
  }

  // A bare UI project is run by its framework, which knows its own server entry.
  const startScript = isApiOnly || nitro ? startScriptFor(scaffold.preset) : undefined;
  if (startScript && framework.addsStartScript) scripts.start = startScript;

  const formatDep = (pkg: string): string => {
    const version = options.packageVersions?.[pkg];
    return version ? `${pkg}@${version}` : pkg;
  };

  if (isApiOnly) {
    await trackedWrite("package.json", packageJsonTemplate(options.projectName, scripts));
    await trackedWrite("tsconfig.json", tsconfigTemplate());
    await trackedWrite(".gitignore", gitignoreTemplate());
    await trackedWrite("vite.config.ts", viteConfigTemplate(scaffold.preset));
  } else {
    await mergeScripts(root, scripts);
  }

  if (nitro) {
    await trackedWrite("nitro.config.ts", nitroConfigTemplate(scaffold.preset));
    if (!isApiOnly) await ignoreNitroOutput(root);
  }

  const layer = framework.layer(scaffold);
  await Promise.all(
    Object.entries(layer.files).map(([relPath, contents]) => trackedWrite(relPath, contents)),
  );
  if (layer.config) await patchConfig(root, layer.config, manualSteps);

  const { serverDir } = scaffold;
  await trackedWrite(
    "taserjs.config.ts",
    taserConfigTemplate(serverDir, framework.extensionlessImports),
  );
  await trackedWrite(`${serverDir}/context.ts`, contextTemplate(collectBootBindings(scaffold)));
  await trackedWrite(
    `${serverDir}/taser.ts`,
    taserTsTemplate(isApiOnly ? undefined : UI_API_BASE_PATH),
  );
  await trackedWrite(`${serverDir}/routes/index.get.ts`, indexRouteTemplate());
  await trackedWrite(`${serverDir}/routes/$.ts`, rootLayoutTemplate());
  if (host) await trackedWrite(`${serverDir}/${HOST_FILE_NAMES[host.runtime]}`, host.template);

  if (!isApiOnly) {
    await trackedWrite(
      UI_CLIENT_FILE,
      apiClientTemplate({
        serverDir,
        manifestImport: `./${posix.relative(posix.dirname(UI_CLIENT_FILE), serverDir)}/.taserjs/routes.gen`,
        baseUrl: clientBaseUrl(scaffold),
      }),
    );
  }

  await Promise.all(
    addons.map((addon) =>
      addon.apply(scaffold, (relPath, contents) => trackedWrite(relPath, contents)),
    ),
  );

  await trackedWrite(`${serverDir}/.taserjs/routes.gen.ts`, staticRoutesGenTemplate());

  return {
    ...options,
    framework: scaffold.framework,
    preset: scaffold.preset,
    host: scaffold.host,
    files: writtenFiles,
    manualSteps,
    dependencies: [...new Set(dependencies)].map(formatDep),
    devDependencies: [...new Set(devDependencies)].map(formatDep),
  };
}
