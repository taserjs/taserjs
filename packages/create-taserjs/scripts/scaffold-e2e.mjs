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
  { framework: "vite", template: "react" },
  { framework: "vite", template: "vue" },
  { framework: "vite", template: "svelte" },
  { framework: "vite", template: "solid" },
  { framework: "vite", template: "preact" },
  { framework: "tanstack-router" },
  { framework: "tanstack-start" },
  { framework: "nextjs" },
  { framework: "nuxt" },
  { framework: "sveltekit" },
  { framework: "react-router" },
  { framework: "none", host: "express" },
  { framework: "none", host: "fastify" },
  { framework: "none", host: "hono" },
  { framework: "none", host: "elysia" },
  { framework: "vite", template: "vue", host: "hono" },
  { framework: "vite", template: "react", host: "express" },
];

// Full-stack frameworks render a page for unknown URLs, so a 200 alone does not prove Taser.js answered.
const TASER_WELCOME = "Welcome to Taser.js!";
const SMOKE_PORT = 4173;
const SMOKE_TIMEOUT_MS = 20_000;
const SMOKE_POLL_MS = 250;

const { scaffoldProject } = await import(
  pathToFileURL(join(import.meta.dirname, "../dist/index.js")).href
);

const caseName = ({ framework, template, preset, host }) =>
  [framework, template, host, preset ?? "default"].filter(Boolean).join("-");

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

// Frameworks whose build output isn't started through the scaffolded `start` script.
const FRAMEWORK_SERVERS = {
  nuxt: { command: "node", args: [".output/server/index.mjs"] },
  "react-router": {
    command: "pnpm",
    args: ["exec", "react-router-serve", "./build/server/index.js"],
  },
  sveltekit: {
    command: "pnpm",
    args: ["exec", "vite", "preview", "--port", String(SMOKE_PORT), "--strictPort"],
  },
};

/** What a case's production server must answer: the first path doubles as the readiness probe. */
function smokeExpectations({ framework, host }) {
  if (FRAMEWORK_SERVERS[framework]) return [["/api", "Taser.js", TASER_WELCOME]];
  const isSpa = framework !== "none";
  return [
    ...(host ? [["/host-info", "host"]] : []),
    [isSpa ? "/api" : "/", "Taser.js"],
    ...(isSpa ? [["/", "UI"]] : []),
  ];
}

function serverCommand(projectDir, framework) {
  if (FRAMEWORK_SERVERS[framework]) return FRAMEWORK_SERVERS[framework];
  const { scripts } = JSON.parse(readFileSync(join(projectDir, "package.json"), "utf-8"));
  const [, ...args] = scripts.start.split(" ");
  return { command: "node", args };
}

/** Runs the production server and checks that every owner of a route (Taser.js, host, UI) answers. */
async function smokeTest(projectDir, testCase) {
  const { command, args } = serverCommand(projectDir, testCase.framework);
  const server = spawn(command, args, {
    cwd: projectDir,
    env: { ...process.env, PORT: String(SMOKE_PORT) },
    stdio: ["ignore", "inherit", "inherit"],
  });
  const origin = `http://localhost:${SMOKE_PORT}`;
  const expectations = smokeExpectations(testCase);

  try {
    await waitForServer(`${origin}${expectations[0][0]}`, Date.now() + SMOKE_TIMEOUT_MS);
    for (const [path, owner, expectedBody] of expectations) {
      // oxlint-disable-next-line no-await-in-loop
      const response = await fetch(`${origin}${path}`);
      if (!response.ok) throw new Error(`${owner} route ${path} answered ${response.status}`);
      // oxlint-disable-next-line no-await-in-loop
      if (expectedBody && !(await response.text()).includes(expectedBody)) {
        throw new Error(`${owner} route ${path} did not return "${expectedBody}"`);
      }
    }
  } finally {
    if (server.exitCode === null && server.signalCode === null) {
      const exited = new Promise((resolve) => server.once("exit", resolve));
      server.kill();
      const timer = setTimeout(() => server.kill("SIGKILL"), 5_000);
      await exited;
      clearTimeout(timer);
    }
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
    return testCase.host || testCase.framework === "vite" || FRAMEWORK_SERVERS[testCase.framework]
      ? smokeTest(projectDir, testCase)
      : undefined;
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
