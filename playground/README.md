# taserjs playground

Browser-only playground for taserjs. Three panels — VFS file tree, Monaco
editor, mock browser — that model the real DX: file-based routes on the left,
a virtual router you can call on the right, and codegen in the middle.

Everything runs client-side. No server, no WebContainers: the app bundle is a
single static artifact deployable to any static host (GitHub Pages, Netlify,
S3…).

## How it works

```
tinymce-free VFS (localStorage + lz-string in the URL hash)
   │
   ├─ scan.ts        regex route scanner (see "Known limits")
   ├─ cli/codegen    the real @taserjs/cli manifest renderer (see below)
   ├─ runner.ts      esbuild-wasm compiles the project in a Blob-URL worker
   │                 and drives app.fetch(new Request(...))
   └─ monaco.ts      Monaco editor + TS language service over the VFS
```

- **`routes.gen.ts` is real.** The manifest under `/.taserjs/` is produced by
  calling `renderManifest()` from **`@taserjs/cli/codegen`** — the exact same
  pure module `taser gen` runs on the CLI (`packages/cli/src/render.ts`). When
  a route file is added/removed in the tree, the manifest regenerates and the
  runner rebuilds, so `/ping` answers `pong` seconds after the file appears.
  The CLI refactor split `@taserjs/cli` into browser-pure modules (no
  `oxc-parser`, no `node:fs` at the `./codegen` subpath), which is why the
  playground and the CLI never drift.
- **The mock browser** is a thin URL bar over `app.fetch(new Request(url))`
  from `@taserjs/runtime` + `@taserjs/router` running inside a web worker.
  esbuild-wasm bundles the virtual project; workspace dependencies are pinned
  to published versions on esm.sh (see `src/pins.ts` and `SPECS` in
  `vite.config.ts` — bump both together).
- **Persistence** is `lz-string`-compressed project state in the location
  hash, with a `localStorage` mirror as fallback. Share a link, get the
  project. A corrupt hash is ignored and rewritten with the current state.

### Type intelligence (the interesting part)

The editor is real Monaco with the real TS language service. Types for
`@taserjs/*`, `hono`, `zod`, and `@standard-schema/spec` are injected at build
time by the `virtual:taser-dts` Vite plugin:

- Every declared `.d.ts` file of every spec is flattened into a virtual
  `node_modules/<name>/<subpath>.d.ts` layout served to the TS worker via
  `addExtraLib`, probed with node-style resolution.
- Each package also gets a one-line stub `package.json` with a plain `types`
  field. `typesVersions`-style stubs are **not** honored by Monaco's TS
  worker filesystem emulation, so subpath declarations (`.d.ts` next to its
  `dist/` sibling, minus the packing directory) are materialized explicitly.
- Cross-file inference is live: hover `state` in `routes/users/$id.get.ts`
  and you get `{ startedAt: number }` because the root layout middleware in
  `routes/$.ts` feeds `RouterRegister` in the generated manifest.

Diagnostics correctness has one non-obvious fix: Monaco only re-validates a
file when _that file_ changes, so a codegen rewrite of the manifest leaves
stale markers (e.g. a stale `RoutePath` union) on route files that did not
change. `pumpDiagnostics()` re-applies `setDiagnosticsOptions` — which fires
the defaults' `onDidChange` and revalidates every model — debounced on every
non-editor VFS event.

## Commands

```sh
pnpm --filter playground dev      # vite dev server
pnpm --filter playground build    # static artifact in dist/
pnpm --filter playground exec tsc --noEmit   # typecheck
```

## Known limits

- The browser scanner is a regex walk, not `oxc-parser` (which is node-only).
  It covers the surface the starter and CLI stubs emit; exotic route files
  may be mis-scanned. The real CLI stays the source of truth.
- `routes.gen.ts` is read-only in the editor UI: edits to it are overwritten
  by the next codegen pass.
- The bundle is large (~5 MB minified) because it ships Monaco + esbuild-wasm and TS. Splitting per-language Monaco chunks was left untuned.

## Full-Node tier (later)

The longer-term `run.taserjs.dev` concept runs real Node via WebContainers
(`@webcontainer/api`) — real `taser` CLI, real file system, real ports — on a
separate surface. This playground is the zero-install tier.
