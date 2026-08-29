# create-taserjs

Official scaffolding CLI for [Taser](https://taserjs.dev) REST API projects.

## Quick Start

### Interactive Mode

```bash
# npm
npm create taserjs@latest my-api

# pnpm
pnpm create taserjs@latest my-api

# bun
bun create taserjs@latest my-api

# yarn
yarn create taserjs my-api
```

### Non-Interactive / CI Mode

Pass flags to scaffold immediately without prompts:

```bash
pnpm create taserjs@latest my-api \
  --framework express \
  --preset node-server \
  --db drizzle:postgres \
  --validator zod \
  --logger pino \
  -y
```

## CLI Flags

| Flag             | Description                                             | Supported Values                                                                                                                   | Default                            |
| :--------------- | :------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------- |
| `--framework`    | Host framework                                          | `none`, `hono`, `express`, `fastify`                                                                                               | `none`                             |
| `--preset`, `-p` | Deployment preset (Nitro preset or `none`)              | `none`, `node-server`, `node-cluster`, `bun`, `deno-server`, `deno-deploy`, `cloudflare-module`, `vercel`, `aws-lambda`, `netlify` | `node-server`                      |
| `--runtime`      | Explicit runtime override (for self-hosted targets)     | `node`, `bun`, `deno`                                                                                                              | Preset default                     |
| `--db`           | Database ODM and driver syntax (`odm:driver`)           | `drizzle`, `prisma`, `kysely` with `:sqlite`, `:postgres`, `:mysql`                                                                | None (driver defaults to `sqlite`) |
| `--validator`    | Schema validation library                               | `zod`, `arktype`, `valibot`                                                                                                        | None                               |
| `--logger`       | Structured logger integration                           | `pino`, `winston`                                                                                                                  | None                               |
| `-y`, `--yes`    | Skip prompts and accept defaults for omitted flags      | `boolean`                                                                                                                          | `false`                            |
| `--noInstall`    | Skip automatic package manager install step             | `boolean`                                                                                                                          | `false`                            |
| `--json`         | Machine-readable JSON output (dumps catalog if no name) | `boolean`                                                                                                                          | `false`                            |

## Programmatic / Machine Inspection

Inspect all supported catalog dimensions and options in JSON:

```bash
npx create-taserjs --json
```

## License

ISC — Copyright (c) 2026, Kazi Ahmed & Taser contributors.
