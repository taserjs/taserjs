# Taser.js Documentation Site

Marketing site and docs for [Taser.js](https://taserjs.dev), built with [Fumadocs](https://fumadocs.dev) and Next.js.

Content lives under `content/docs/`. Landing page components live under `src/components/landing/`.

## Development

From the monorepo root:

```bash
pnpm --filter docs dev
```

Or inside this package:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script           | Description                     |
| :--------------- | :------------------------------ |
| `pnpm dev`       | Start the Next.js docs app      |
| `pnpm build`     | Production build                |
| `pnpm typecheck` | `next typegen` + `tsc --noEmit` |

## LLM Resources

Generated from docs content at:

- `/llms.txt` — concise quick reference + page index
- `/llms-full.txt` — full consolidated documentation text

## Packages Documented

- `@taserjs/router` — routes, layouts, middleware, reply/stream
- `@taserjs/cli` — `taser generate`, `taserjs.config.ts`
- `@taserjs/plugin` — Vite, Next, Nitro, and other bundlers
- `@taserjs/client` — `createClient<AppManifest>()`

See the [repository README](../README.md) for scaffolding and community links.
