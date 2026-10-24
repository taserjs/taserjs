---
"@taserjs/cli": minor
"@taserjs/plugin": minor
"@taserjs/runtime": minor
"@taserjs/utils": minor
"@taserjs/router": minor
"@taserjs/client": minor
"create-taserjs": minor
---

refactor: Clean refactor of the dev tooling (cli, plugin, utils)

- cli: drop the `formatting` option, always scaffold `taser.ts`, replace `yargs`/`picocolors` with Node built-ins, export `watchRoutes`, ESM-only with a dedicated `dist/bin.js`.
- plugin: split into focused modules, one `shouldRegenerate` check, one route watcher shared with the CLI, realpath-aware Vite invalidation (newly added routes are served without a restart), no package root export, remove `withTaser` and `runNextTaserGeneration`.
- runtime: add `mountFetchHost` (`@taserjs/runtime/serve`) and `mountNodeHost` (`@taserjs/runtime/serve/node`), and re-export `toNodeHandler`.
- utils: one typed-response core, shared header defaults, shared zero-trace error base, lazy 415 response, remove `validateStandardSchema`.
