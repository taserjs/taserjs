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

# Vue web app (served together with the API by Nitro)
pnpm create taserjs@latest my-app --framework vue --db drizzle --driver sqlite -y
```

## Options

| Flag                | Values                                                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `--framework`, `-f` | `none` (API only), `tanstack-router`, `vue`, `tanstack-start`, `nextjs`                                           |
| `--preset`, `-p`    | `bare` (no Nitro) or a Nitro preset such as `node-server`, `cloudflare-module`, `vercel`, `netlify`, `aws-lambda` |
| `--host`            | `none`, `express`, `fastify`, `hono`, `elysia`: an existing server that Taser.js falls through to                 |
| `--db` / `--driver` | `drizzle`, `prisma`, `kysely` / `sqlite`, `postgres`, `mysql`                                                     |
| `--validator`, `-v` | `zod`, `valibot`, `arktype`                                                                                       |
| `--logger`, `-l`    | `pino`, `winston`                                                                                                 |
| `--skip-install`    | Skip installing dependencies                                                                                      |
| `--yes`, `-y`       | Skip prompts and use defaults                                                                                     |

`--host` applies to API-only, `tanstack-router` and `vue` projects; Express and Fastify cannot run on Cloudflare presets. UI projects are created with the framework's official generator, then Taser.js is added on top. Web apps on Vite need a Nitro preset; `bare` is available for API only and TanStack Start. Next.js deploys through its own adapter, so no preset applies.

## Documentation

Guides and API reference: [taserjs.dev](https://taserjs.dev)

## License

[ISC](https://github.com/taserjs/taserjs/blob/main/LICENSE)
