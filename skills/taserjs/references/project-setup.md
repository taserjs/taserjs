# Project Setup & Configuration

Read when scaffolding a new project, adding Taser.js to an existing app, configuring `taserjs.config.ts`, or setting up build scripts.

## CLI Scaffolding

Scaffold interactive or headless projects with `create-taserjs`:

```bash
pnpm create taserjs@latest my-api
```

Non-interactive CI and agent flags (`create-taserjs --help`):

| Flag              | Options                                                                                            | Default / Description                                                  |
| :---------------- | :------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------- |
| `-f, --framework` | `none`, `tanstack-router`, `react-router`, `tanstack-start`, `nextjs`, `nuxt`, `sveltekit`, `vite` | `none` (API-only)                                                      |
| `-t, --template`  | `react`, `vue`, `svelte`, `solid`, `preact`                                                        | Template for `--framework vite`                                        |
| `-p, --preset`    | `node-server`, `cloudflare-module`, `vercel`, `netlify`, `aws-lambda`, or any Nitro preset         | `node-server`                                                          |
| `--host`          | `none`, `express`, `fastify`, `hono`, `elysia`                                                     | `none` (Host pass-through server)                                      |
| `-v, --validator` | `zod`, `valibot`, `arktype`, `none`                                                                | Standard Schema library                                                |
| `--db`            | `drizzle`, `prisma`, `kysely`, `none`                                                              | Database ORM/query builder                                             |
| `--driver`        | `sqlite`, `postgres`, `mysql`                                                                      | Database driver                                                        |
| `-l, --logger`    | `pino`, `winston`, `none`                                                                          | Structured logger                                                      |
| `--skip-install`  | boolean                                                                                            | Skip dependency install (the agent skill still installs)               |
| `--skill`         | boolean                                                                                            | Install the Taser.js agent skill (default: true; `--no-skill` to skip) |
| `-y`, `--yes`     | boolean                                                                                            | Accept default values for unprovided options                           |

> [!NOTE]
> `--db` and `--driver` are separate flags (e.g. `--db drizzle --driver postgres`). There is no `--json` flag or combined `drizzle:postgres` syntax.

> [!NOTE]
> The agent skill installs from `taserjs/taserjs` via the `skills` CLI. It requires Node.js 22.20 or later. A failed skill install never fails the scaffold. Add `--no-skill` in CI when you do not want it.

Example non-interactive scaffold:

```bash
pnpm create taserjs@latest my-api \
  --framework none \
  --preset node-server \
  --db drizzle \
  --driver sqlite \
  --validator zod \
  --logger pino \
  -y
```

## Generated Project Layouts

### 1. API-Only (`--framework none`)

```text
my-api/
├── nitro.config.ts         # Nitro server preset configuration
├── taserjs.config.ts       # Server & route directories
├── vite.config.ts          # Vite configuration with taser() and nitro() plugins
├── tsconfig.json           # NodeNext module resolution, strict mode
├── package.json            # scripts: dev, build, start
└── src/
    ├── taser.ts            # export default defineTaser({ ... })
    ├── context.ts          # createContext({ boot, request })
    ├── routes/
    │   ├── index.get.ts    # GET /
    │   └── $.ts            # Root layout: t.layout("/*")
    └── .taserjs/
        └── routes.gen.ts   # Generated app manifest & ambient types
```

### 2. Fullstack Frameworks (`nextjs`, `tanstack-start`, `react-router`, `sveltekit`)

Server routes and application files live in `src/server` (or `app/server` in React Router):

```text
my-app/
├── taserjs.config.ts       # serverDir: "src/server"
└── src/
    ├── server/
    │   ├── taser.ts
    │   ├── context.ts
    │   └── routes/
    └── app/ (or routes/)   # Framework frontend files and API catch-all mount
```

### 3. Nuxt (`--framework nuxt`)

Nuxt reserves `server/` and `app/` for its own file-based routing. Taser.js isolates server files under `api/`:

```text
my-nuxt-app/
├── taserjs.config.ts       # serverDir: "api"
├── api/
│   ├── taser.ts
│   ├── context.ts
│   └── routes/
└── server/api/
    ├── [...slug].ts        # Nuxt catch-all handler forwarding to Taser app
    └── index.ts            # Nuxt root /api handler forwarding to Taser app
```

## Manual Installation

Add Taser.js packages to an existing project:

```bash
# Standalone / API-only
pnpm add @taserjs/router @taserjs/runtime zod
pnpm add -D @taserjs/cli @taserjs/plugin vite nitro

# Fullstack or frontend consumer (adds typed client)
pnpm add @taserjs/client
```

## Configuration Files

### `taserjs.config.ts`

Defines filesystem paths for routes scanning and manifest generation:

```ts
import { defineConfig } from "@taserjs/cli";

export default defineConfig({
  serverDir: "src", // Base server directory (e.g. "src", "src/server", "api")
  routesDir: "routes", // Route directory relative to serverDir
  outputDir: ".taserjs", // Output directory relative to serverDir for routes.gen.ts
  app: "taser.ts", // Application definition file relative to serverDir
});
```

### `vite.config.ts` (Standalone / API-Only)

```ts
import { defineConfig } from "vite";
import { taser } from "@taserjs/plugin/vite";
import { nitro } from "nitro/vite";

export default defineConfig({
  plugins: [taser(), nitro()],
});
```

### `nitro.config.ts`

```ts
import { defineConfig } from "nitro/config";

export default defineConfig({
  preset: "node-server",
});
```

## CLI Commands

The `@taserjs/cli` binary provides `taser` (or `npx @taserjs/cli`):

```bash
# Generate manifest and ambient route types
taser generate

# Generate with explicit config file
taser generate -c taserjs.config.ts

# Watch mode for route generation
taser generate -w
```

## Verify

1. Run `taser generate` or `npx @taserjs/cli generate`.
2. Confirm `${serverDir}/.taserjs/routes.gen.ts` exists and contains `export const app = createTaserApp(...)`.
3. Run `npx tsc --noEmit` to verify type resolutions.
