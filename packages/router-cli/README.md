# @taserjs/router-cli

CLI for Taser route manifest generation

## Installation

**npm:**

```bash
npm install @taserjs/router-cli
```

**JSR:**

```bash
deno add jsr:@taserjs/router-cli
npx jsr add @taserjs/router-cli
```

## Commands

- `taser generate` — Generate route manifest once
- `taser watch` — Watch route files and regenerate on change
- `taser init` — Create a default taser.config.json
- `taser scaffold <path>` — Scaffold a route or layout file
- `taser openapi` — Generate an OpenAPI spec (proxies to the `taser-openapi` CLI; requires [`@taserjs/openapi`](https://github.com/taserjs/taserjs/tree/main/packages/openapi) to be installed)

## Documentation

See the [main documentation](https://github.com/taserjs/taserjs) for usage examples and API reference.

## License

ISC
