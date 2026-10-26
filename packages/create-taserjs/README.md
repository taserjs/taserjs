# create-taserjs

Scaffold a new Taser.js application: an API, a Vite web app, or a fullstack framework, with your choice of deployment, database, validator, and logger.

## Usage

```bash
npm create taserjs@latest my-api
# or
pnpm create taserjs@latest my-api
```

Non-interactive examples:

```bash
# API only, deployed with Nitro's node-server preset
pnpm create taserjs@latest my-api --framework none --preset node-server -y

# Vite web app with a Vue template (served together with the API by Nitro)
pnpm create taserjs@latest my-app --framework vite --template vue --db drizzle --driver sqlite -y
```

## Options

| Flag                | Values                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `--framework`, `-f` | `none` (API only), `tanstack-router`, `react-router`, `tanstack-start`, `nextjs`, `nuxt`, `sveltekit`, `vite` |
| `--template`, `-t`  | `react` (default), `vue`, `svelte`, `solid`, `preact`: the create-vite template for `--framework vite`        |
| `--preset`, `-p`    | a Nitro preset such as `node-server` (default), `cloudflare-module`, `vercel`, `netlify`, `aws-lambda`        |
| `--host`            | `none`, `express`, `fastify`, `hono`, `elysia`: an existing server that Taser.js falls through to             |
| `--db` / `--driver` | `drizzle`, `prisma`, `kysely` / `sqlite`, `postgres`, `mysql`                                                 |
| `--validator`, `-v` | `zod`, `valibot`, `arktype`                                                                                   |
| `--logger`, `-l`    | `pino`, `winston`                                                                                             |
| `--skip-install`    | Skip installing dependencies (the agent skill still installs)                                                 |
| `--skill`           | Install the Taser.js agent skill via the `skills` CLI (enabled by default; use `--no-skill` to skip)          |
| `--yes`, `-y`       | Skip prompts and use defaults                                                                                 |

After the scaffold and its instructions are printed, interactive mode asks whether to install the agent skill and then hands the terminal to `skills add`. Headless mode runs the non-interactive equivalent of `skills add taserjs/taserjs --skill taserjs --yes`. The `skills` CLI requires Node.js 22.20 or later. A failed skill install never fails the scaffold.

`--host` applies to API-only, `tanstack-router` and `vite` projects; Express and Fastify cannot run on Cloudflare presets. UI projects are created with the framework's official generator, then Taser.js is added on top. API-only, Vite and TanStack Start projects deploy through a Nitro preset, `node-server` by default. Next.js, Nuxt, SvelteKit and React Router deploy through their own adapter or Nitro preset, so no preset applies.

## Documentation

Guides and API reference: [taserjs.dev](https://taserjs.dev)

## License

[ISC](https://github.com/taserjs/taserjs/blob/main/LICENSE)
