# Vue + Taser.js

A Vue 3 single-page app (Vue Router) with a Taser.js API under `/api`. Nitro serves the built UI and the API together.

Created with `create-taserjs --framework vue --preset node-server`.

## Structure

- `src/server/`: Taser.js app (`taser.ts`, `context.ts`, `routes/`). `serverDir` in `taserjs.config.ts` points here.
- `src/api.ts`: typed `@taserjs/client` bound to the generated route manifest.
- `vite.config.ts`: `taser({ standalone: false })` registers the API as a Nitro handler next to the UI.

## Scripts

- `pnpm dev`: Vite dev server with the API mounted at `/api`.
- `pnpm build`: Vue type-check plus production build into `.output/`.
- `pnpm start`: Run the built server.
