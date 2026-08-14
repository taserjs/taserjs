<p align="center">
  <a href="https://taserjs.dev">
    <img src="https://raw.githubusercontent.com/taserjs/taserjs/refs/heads/main/docs/src/assets/logo.svg" alt="TaserJS" width="180" />
  </a>
  <hr />

  <a href="https://www.npmjs.com/package/@taserjs/router">
    <img alt="npm version" src="https://img.shields.io/npm/v/@taserjs/router?style=for-the-badge&logo=npm&logoColor=white&label=npm" />
  </a>
  <a href="https://www.npmjs.com/package/@taserjs/router">
    <img alt="npm downloads" src="https://img.shields.io/npm/dw/@taserjs/router?style=for-the-badge&logo=npm&logoColor=white&label=downloads" />
  </a>
  <a href="https://github.com/taserjs/taserjs/blob/main/LICENSE">
    <img alt="license" src="https://img.shields.io/npm/l/@taserjs/router?style=for-the-badge&logo=open-source-initiative&logoColor=white&label=license" />
  </a>
  <a href="https://github.com/taserjs/taserjs/actions/workflows/release.yml">
    <img alt="build" src="https://img.shields.io/github/actions/workflow/status/taserjs/taserjs/release.yml?branch=main&style=for-the-badge&logo=github&logoColor=white&label=build" />
  </a>
  <a href="https://jsr.io/@taserjs/router">
    <img alt="jsr" src="https://img.shields.io/jsr/v/@taserjs/router?style=for-the-badge&logo=deno&logoColor=white&label=jsr" />
  </a>
  <a href="https://taserjs.dev">
    <img alt="docs" src="https://img.shields.io/badge/docs-taserjs.dev-blue?style=for-the-badge&logo=readthedocs&logoColor=white" />
  </a>
</p>

<hr />

Type-safe file-based routing for APIs.

Taser is a router where your file tree is your API. Write routes as files, compose layouts and middleware with full type inference, validate inputs at runtime, and mount one router on Express, Hono, Fastify, or Node — then call it all from a fully typed client.

## Features

- **File-based routes** — Drop a handler file, and codegen keeps the manifest in sync.
- **Types on the wire** — Query, params, body, returns, and context flow through middleware chains.
- **Typed client** — Export `TaserAppRouter` and call your API with the same types your handlers use.
- **Your runtime** — One router definition with adapters for Express, Hono, Fastify, and Node.

## Quick start

Scaffold a project in under a minute:

```bash
npm create taserjs@latest
```

Define a route:

```ts
import { reply } from '@taserjs/router'
import { z } from 'zod' // or any other validation library
import { t } from '../taser'

export const Route = t.get('/search', {
  query: z.object({ q: z.string().min(1) }),
}).handler((ctx) => {
  return reply.json({ q: ctx.query.q })
})
```

Call it with the typed client:

```ts
const client = createClient<TaserAppRouter>({ baseURL: 'https://api.example.com' })
const response = await client.search.$get({ query: { q: 'taser' } })
const json = await response.json()
// json is inferred from the route's return type
```

See the [full documentation](https://taserjs.dev) for routing, layouts and middleware, adapters, and the API reference.

## Author

[Kazi Ahmed](https://github.com/tzsk) · [x.com/KaziAhmedDev](https://x.com/KaziAhmedDev)

## Socials

- X / Twitter: [@taserjs](https://x.com/taserjs)
- Website: [taserjs.dev](https://taserjs.dev)

## Contributing

Bug reports, feature requests, and pull requests are welcome on the [GitHub repository](https://github.com/taserjs/taserjs).

## License

[ISC](LICENSE) — Copyright (c) 2026, Taserjs contributors.