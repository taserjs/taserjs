# Basic Taser Application

A reference test application demonstrating Taser's new Nitro-based architecture.

## Structure

- `src/context.ts`: Context definition with per-request ID.
- `src/taser.ts`: Taser application initialization with response validation.
- `src/routes/`:
  - `$.ts`: Root splat layout applying CORS middleware.
  - `index.get.ts`: Welcome endpoint returning JSON status (`GET /`).
  - `hello.get.ts`: Query validated greeting endpoint (`GET /hello?name=...`).
  - `users/$id.get.ts`: Parameterized route (`GET /users/:id`).
  - `todos.post.ts`: Body validated POST route (`POST /todos`).

## Scripts

- `pnpm generate`: Generate ambient route types at `.taser/types/routes.d.ts`.
- `pnpm dev`: Start the Nitro dev server with Vite and HMR.
- `pnpm build`: Build the production server bundle into `.output/`.
- `pnpm typecheck`: Run TypeScript type-checking without emitting.
