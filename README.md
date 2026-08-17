<p align="center">
  <a href="https://taserjs.dev">
    <img src="https://raw.githubusercontent.com/tzsk/taser/main/docs/src/assets/logo.svg" alt="Taser" width="220" />
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
  <a href="https://jsr.io/@taserjs/router">
    <img alt="jsr" src="https://img.shields.io/jsr/v/@taserjs/router?style=for-the-badge&logo=deno&logoColor=white&label=jsr" />
  </a>
  <a href="https://discord.gg/Q3AQUBKqt">
    <img alt="discord" src="https://img.shields.io/badge/Discord-Join%20Community-5865F2?style=for-the-badge&logo=discord&logoColor=white" />
  </a>
  <a href="https://x.com/taserjs">
    <img alt="X (Twitter)" src="https://img.shields.io/badge/X-Follow%20%40taserjs-000000?style=for-the-badge&logo=x&logoColor=white" />
  </a>
  <a href="https://github.com/tzsk/taser/blob/main/LICENSE">
    <img alt="license" src="https://img.shields.io/npm/l/@taserjs/router?style=for-the-badge&logo=open-source-initiative&logoColor=white&label=license" />
  </a>
</p>

<hr />

## 📖 Documentation

All guides, routing patterns, middleware architecture, adapter tutorials, and API references are available on the official documentation site:

### 👉 [**Explore the Full Documentation & Guides →**](https://taserjs.dev/docs)

<hr />

## What is Taser?

Taser brings the intuition and ergonomics of **TanStack Router** to backend HTTP APIs.

Traditional Node.js routers force painful trade-offs between clean folder structures and real type safety. Taser eliminates the type assertion trap (`req.user as User`) with deterministic file-based routing, cascading middleware context, compile-time return contracts, and an auto-generated client SDK.

### Core Highlights

- **Deterministic File-Based Routing** — Endpoints live in HTTP verb files (`.get.ts`, `.post.ts`, `.put.ts`, `.delete.ts`); non-verb files act as directory-scoped middleware. Zero manual route registration tables.
- **Cascading Typed Context** — State injected by middleware (`next({ state: { user } })`) flows into `ctx.state` with 100% compile-time inference and zero type assertions.
- **Compiler-Enforced Return Contracts** — `.returns({ 200: schema })` catches payload drift and prevents breaking changes before deployment.
- **Framework Agnostic** — Mount on Express, Hono, Fastify, Bun, or plain Node.js without changing your handler logic.
- **Standard Schema First** — Validate query, params, headers, and body with Zod, ArkType, Valibot, or any Standard Schema library.
- **Zero-Drift Typed Client** — Export router types and consume your API on the frontend with complete autocomplete and return type inference.

<hr />

## Quick Start

Scaffold a complete project with your choice of runtime, database, validator, and logger in seconds:

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
pnpm create taserjs@latest my-api --type express --db drizzle --driver postgres --validator zod --logger pino -y
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
      <em>Creator and Maintainer of Taser</em><br /><br />
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

[ISC](LICENSE) — Copyright (c) 2026, [Kazi Ahmed](https://github.com/tzsk) & Taser contributors.
