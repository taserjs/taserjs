# @taserjs/router-cli

Command-line interface for Taser.js ambient type generation and route scaffolding.

## Installation

```bash
# npm
npm install -D @taserjs/router-cli

# pnpm
pnpm add -D @taserjs/router-cli

# bun
bun add -D @taserjs/router-cli
```

## Usage

```bash
# Generate types from config in current directory
taser generate

# Or specify an explicit config file (vite.config, nitro.config, or next.config)
taser generate --config next.config.ts

# On-demand via npx
npx @taserjs/router-cli generate
```

### Options

| Flag       | Alias | Description                                                                                                                  | Default                  |
| ---------- | ----- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `--config` | `-c`  | Path to config file (`vite.config`, `nitro.config`, or `next.config`). When omitted, searches the current working directory. | Current directory search |

Configuration is required via a supported framework config file (`vite.config`, `nitro.config`, or `next.config`).

## Documentation

Full documentation and guides are available at [https://taserjs.dev](https://taserjs.dev/docs/cli).

## License

ISC
