<p align="center">
  <a href="https://taserjs.dev">
    <img src="https://raw.githubusercontent.com/taserjs/taserjs/refs/heads/main/docs/src/assets/logo.svg" alt="Taser.js" width="220" />
  </a>
</p>

<p align="center">
  <strong>Type-Safe File-Based Routing for REST APIs</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@taserjs/router">
    <img alt="npm version" src="https://img.shields.io/npm/v/@taserjs/router?style=for-the-badge&logo=npm&logoColor=white&label=npm" />
  </a>
  <a href="https://www.npmjs.com/package/@taserjs/router">
    <img alt="npm downloads" src="https://img.shields.io/npm/dw/@taserjs/router?style=for-the-badge&logo=npm&logoColor=white&label=downloads" />
  </a>
  <a href="https://discord.gg/Q3AQUBKqt">
    <img alt="discord" src="https://img.shields.io/badge/Discord-Join%20Community-5865F2?style=for-the-badge&logo=discord&logoColor=white" />
  </a>
  <a href="https://x.com/taserjs">
    <img alt="X (Twitter)" src="https://img.shields.io/badge/X-Follow%20%40taserjs-000000?style=for-the-badge&logo=x&logoColor=white" />
  </a>
  <a href="https://github.com/taserjs/taserjs/blob/main/LICENSE">
    <img alt="license" src="https://img.shields.io/npm/l/@taserjs/router?style=for-the-badge&logo=open-source-initiative&logoColor=white&label=license" />
  </a>
</p>

<hr />

## 📖 Documentation

All guides, routing patterns, middleware architecture, adapter tutorials, and API references are available on the official documentation site:

### 👉 [**Explore the Full Documentation & Guides →**](https://taserjs.dev)

LLM-oriented references: [`/llms.txt`](https://taserjs.dev/llms.txt) · [`/llms-full.txt`](https://taserjs.dev/llms-full.txt)

<hr />

## What is Taser.js?

Taser.js brings the intuition and ergonomics of **TanStack Router** to backend HTTP APIs.

Traditional Node.js routers force painful trade-offs between clean folder structures and real type safety. Taser.js eliminates the type assertion trap with deterministic file-based routing, cascading middleware state, compile-time return contracts, and a zero-codegen typed client.

### Packages

| Package | Role |
| :------ | :--- |
| `@taserjs/router` | File-based route builders, layouts, middleware, reply/stream helpers |
| `@taserjs/cli` | `taser generate` and `taserjs.config.ts` |
| `@taserjs/plugin` | Vite, Next, Nitro, Webpack, Rspack, Rollup, Rolldown, Esbuild |
| `@taserjs/client` | Typed proxy client from generated `AppManifest` |

### Core Highlights

- **`defineTaser()`** — Export an uninstantiated app definition; the runnable Hono `app` is compiled into `src/.taserjs/routes.gen.ts`.
- **Deterministic File-Based Routing** — Verb files (`.get.ts`, `.post.ts`, …); non-verb files are layouts. Zero manual route tables.
- **Facet-Split Handlers** — `{ req, ctx, state, ...services }`: HTTP inputs on `req`, boot/request services on `ctx`, cascaded middleware values on `state`.
- **Compiler-Enforced Return Contracts** — `.returns({ 200: schema })` catches payload drift before deploy.
- **Framework Agnostic** — Standalone Vite/Nitro, Next.js App Router, TanStack Start, or host pass-through (Express, Hono, Fastify).
- **Standard Schema First** — Zod, ArkType, Valibot, or any Standard Schema library.
- **Zero-Drift Typed Client** — `createClient<AppManifest>()` from `@taserjs/client` and `routes.gen.ts`.

<hr />

## Quick Start

Scaffold a complete project with your choice of host framework, deployment preset, database, validator, and logger:

```bash
# npm
npm create taserjs@latest my-api

# pnpm
pnpm create taserjs@latest my-api

# bun
bun create taserjs@latest my-api
```

Or pass flags directly for non-interactive / CI setup:

```bash
pnpm create taserjs@latest my-api \
  --framework express \
  --preset node-server \
  --db drizzle:postgres \
  --validator zod \
  --logger pino \
  -y
```

Add to an existing app:

```bash
pnpm add @taserjs/router @taserjs/client zod
pnpm add -D @taserjs/plugin @taserjs/cli vite
```

<hr />

## Author

<table>
  <tr>
    <td align="center" width="120">
      <a href="https://github.com/tzsk">
        <img src="https://github.com/tzsk.png" width="90" height="90" style="border-radius: 50%;" alt="Kazi Ahmed" />
      </a>
    </td>
    <td>
      <strong>Kazi Ahmed</strong><br />
      <em>Creator and Maintainer of Taser.js</em><br /><br />
      <a href="https://github.com/tzsk">GitHub (@tzsk)</a> &nbsp;•&nbsp;
      <a href="https://x.com/KaziAhmedDev">X (@KaziAhmedDev)</a> &nbsp;•&nbsp;
      <a href="https://github.com/sponsors/tzsk">Sponsor on GitHub</a>
    </td>
  </tr>
</table>

<hr />

## Community & Links

- **Documentation**: [https://taserjs.dev](https://taserjs.dev)
- **Discord Community**: [https://discord.gg/Q3AQUBKqt](https://discord.gg/Q3AQUBKqt)
- **X / Twitter**: [@taserjs](https://x.com/taserjs)
- **GitHub Repository**: [taserjs/taserjs](https://github.com/taserjs/taserjs)

<hr />

## License

[ISC](LICENSE) — Copyright (c) 2026, [Kazi Ahmed](https://github.com/tzsk) & Taser.js contributors.
