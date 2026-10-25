// Runs the real framework generators, links the workspace's Taser.js packages, and builds each result.
// Slow and network-bound, so it runs on a schedule (see .github/workflows/scaffold-e2e.yml), not per PR.
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const PACKAGES_DIR = resolve(import.meta.dirname, "../..");
const WORKSPACE_PACKAGES = new Set([
  "@taserjs/router",
  "@taserjs/runtime",
  "@taserjs/client",
  "@taserjs/cli",
  "@taserjs/plugin",
]);

const CASES = [
  { framework: "none" },
  { framework: "none", preset: "node-server" },
  { framework: "vue", preset: "node-server" },
  { framework: "tanstack-router", preset: "node-server" },
  { framework: "tanstack-start" },
  { framework: "tanstack-start", preset: "node-server" },
  { framework: "nextjs" },
  { framework: "none", host: "express" },
  { framework: "none", host: "fastify", preset: "node-server" },
  { framework: "none", host: "hono" },
  { framework: "none", host: "elysia" },
  { framework: "vue", host: "hono", preset: "node-server" },
];

const SMOKE_PORT = 4173;
const SMOKE_TIMEOUT_MS = 20_000;
const SMOKE_POLL_MS = 250;

const { scaffoldProject } = await import(
  pathToFileURL(join(import.meta.dirname, "../dist/index.js")).href
);

const caseName = ({ framework, preset, host }) =>
  [framework, host, preset ?? "default"].filter(Boolean).join("-");

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function waitForServer(url, deadline) {
  while (Date.now() < deadline) {
    try {
      // oxlint-disable-next-line no-await-in-loop
      return await fetch(url);
    } catch {
      // oxlint-disable-next-line no-await-in-loop
      await sleep(SMOKE_POLL_MS);
    }
  }
  throw new Error(`Server did not answer at ${url}`);
}

/** Runs the production server and checks that Taser.js, the host and (for SPAs) the UI all answer. */
async function smokeTest(projectDir, testCase) {
  const { scripts } = JSON.parse(readFileSync(join(projectDir, "package.json"), "utf-8"));
  const [, ...args] = scripts.start.split(" ");
  const server = spawn("node", args, {
    cwd: projectDir,
    env: { ...process.env, PORT: String(SMOKE_PORT) },
    stdio: ["ignore", "inherit", "inherit"],
  });
  const origin = `http://localhost:${SMOKE_PORT}`;
  const isSpa = testCase.framework !== "none";

  try {
    await waitForServer(`${origin}/host-info`, Date.now() + SMOKE_TIMEOUT_MS);
    const expectations = [
      ["/host-info", "host"],
      [isSpa ? "/api" : "/", "Taser.js"],
      ...(isSpa ? [["/", "UI"]] : []),
    ];
    for (const [path, owner] of expectations) {
      // oxlint-disable-next-line no-await-in-loop
      const response = await fetch(`${origin}${path}`);
      if (!response.ok) throw new Error(`${owner} route ${path} answered ${response.status}`);
    }
  } finally {
    server.kill();
  }
}

const run = (command, args, cwd) =>
  execFileSync(command, args, { cwd, stdio: ["ignore", "inherit", "inherit"] });

function pinWorkspacePackages(projectDir, { dependencies, devDependencies }) {
  const file = join(projectDir, "package.json");
  const pkg = JSON.parse(readFileSync(file, "utf-8"));
  const target = (names, key) => {
    pkg[key] ??= {};
    for (const name of names) {
      const bare = name.replace(/(?<=.)@.*$/, "");
      pkg[key][bare] = WORKSPACE_PACKAGES.has(bare)
        ? `link:${join(PACKAGES_DIR, bare.replace("@taserjs/", ""))}`
        : "latest";
    }
  };
  target(dependencies, "dependencies");
  target(devDependencies, "devDependencies");
  writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
}

// Turbopack refuses to resolve symlinked packages outside the project root. Published packages are
// copied into node_modules, so only the linked workspace packages in this script need a wider root.
function widenTurbopackRoot(projectDir) {
  const file = join(projectDir, "next.config.ts");
  const config = readFileSync(file, "utf-8");
  writeFileSync(
    file,
    config.replace(
      "const nextConfig: NextConfig = {",
      'const nextConfig: NextConfig = {\n  turbopack: { root: "/" },',
    ),
  );
}

function runCase(testCase, workDir) {
  const projectDir = join(workDir, caseName(testCase));
  mkdirSync(workDir, { recursive: true });

  return scaffoldProject({
    projectName: caseName(testCase),
    targetDir: projectDir,
    agent: "pnpm",
    skipInstall: true,
    ...testCase,
  }).then((result) => {
    pinWorkspacePackages(projectDir, result);
    if (testCase.framework === "nextjs") widenTurbopackRoot(projectDir);
    run("pnpm", ["install", "--ignore-workspace"], projectDir);
    run("pnpm", ["run", "build"], projectDir);
    return testCase.host ? smokeTest(projectDir, testCase) : undefined;
  });
}

const only = process.argv[2];
const selected = only ? CASES.filter((testCase) => caseName(testCase).startsWith(only)) : CASES;
const workDir = mkdtempSync(join(tmpdir(), "taser-scaffold-e2e-"));
const failures = [];

for (const testCase of selected) {
  console.log(`\n=== ${caseName(testCase)} ===`);
  try {
    // Sequential on purpose: each case installs and builds a full project, and logs stay readable.
    // oxlint-disable-next-line no-await-in-loop
    await runCase(testCase, workDir);
  } catch (error) {
    failures.push(caseName(testCase));
    console.error(`FAILED ${caseName(testCase)}: ${error.message}`);
  }
}

rmSync(workDir, { recursive: true, force: true });

if (failures.length > 0) {
  console.error(`\nFailed scaffolds: ${failures.join(", ")}`);
  process.exit(1);
}
console.log(`\nAll ${selected.length} scaffolds built.`);
