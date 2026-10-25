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
import { startScriptFor } from "./presets.js";
import { resolveScaffold } from "./resolve.js";
import type { ScaffoldOptions, ScaffoldResult } from "./types.js";

const UI_API_BASE_PATH = "/api";
const DEFAULT_UI_CLIENT_FILE = "src/api.ts";

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

/** An import specifier from one project file to another, always starting with `./` or `../`. */
function relativeImport(fromFile: string, toModule: string): string {
  const relative = posix.relative(posix.dirname(fromFile), toModule);
  return relative.startsWith(".") ? relative : `./${relative}`;
}

export async function scaffoldProject(options: ScaffoldOptions): Promise<ScaffoldResult> {
  const { scaffold, framework } = resolveScaffold(options);
  const root = options.targetDir;
  const isApiOnly = framework.group === "api";
  const { preset } = scaffold;
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
      template: scaffold.template,
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
    ...(preset ? ["nitro"] : []),
    ...(host?.devDependencies ?? []),
  ];

  for (const addon of addons) {
    dependencies.push(...addon.dependencies(scaffold));
    devDependencies.push(...addon.devDependencies(scaffold));
    Object.assign(scripts, addon.scripts?.(scaffold));
  }

  const startScript = startScriptFor(preset);
  if (startScript && framework.addsStartScript) scripts.start = startScript;

  const formatDep = (pkg: string): string => {
    const version = options.packageVersions?.[pkg];
    return version ? `${pkg}@${version}` : pkg;
  };

  if (isApiOnly) {
    await trackedWrite("package.json", packageJsonTemplate(options.projectName, scripts));
    await trackedWrite("tsconfig.json", tsconfigTemplate());
    await trackedWrite(".gitignore", gitignoreTemplate());
    await trackedWrite("vite.config.ts", viteConfigTemplate());
  } else {
    await mergeScripts(root, scripts);
  }

  if (preset) {
    await trackedWrite("nitro.config.ts", nitroConfigTemplate(preset));
    if (!isApiOnly) await ignoreNitroOutput(root);
  }

  const layer = framework.layer(scaffold);
  await Promise.all(
    Object.entries(layer.files).map(([relPath, contents]) => trackedWrite(relPath, contents)),
  );
  for (const config of [layer.config ?? []].flat()) {
    // Sequential on purpose: each codemod may rewrite a file the next one reads.
    // oxlint-disable-next-line no-await-in-loop
    await patchConfig(root, config, manualSteps);
  }

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
    const clientFile = framework.clientFile ?? DEFAULT_UI_CLIENT_FILE;
    await trackedWrite(
      clientFile,
      apiClientTemplate({
        serverDir,
        manifestImport: relativeImport(clientFile, `${serverDir}/.taserjs/routes.gen`),
        baseUrl: framework.clientBaseUrl ?? UI_API_BASE_PATH,
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
    template: scaffold.template,
    preset,
    host: scaffold.host,
    files: writtenFiles,
    manualSteps,
    dependencies: [...new Set(dependencies)].map(formatDep),
    devDependencies: [...new Set(devDependencies)].map(formatDep),
  };
}
