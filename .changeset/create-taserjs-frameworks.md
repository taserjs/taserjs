---
"create-taserjs": minor
---

feat: Scaffold UI and fullstack projects, and stop choosing a runtime

- New `--framework` option (and a "What are you building?" prompt): `none` (API only), `tanstack-router`, `vue`, `tanstack-start`, `nextjs`. UI projects run the framework's official generator and add Taser.js on top (`src/server`, `/api` base path, a typed client in `src/api.ts`, and a config codemod).
- Deployment is now `bare` (no Nitro, formerly `none`) or a Nitro preset. The prompt offers Node.js, Cloudflare Workers, Vercel, Netlify and AWS Lambda; `--preset` accepts any Nitro preset. Vite web apps require a preset, and Next.js skips the question because it deploys through its own adapter.
- Breaking: remove `--runtime`, the runtime prompt, the implied-runtime logic, and the generated `wrangler.jsonc` and platform-specific dev dependencies.
- New `--host` option (`none`, `express`, `fastify`, `hono`, `elysia`) for API-only and Vite projects. It scaffolds `server.node.ts` or `server.ts` in the server directory, which Taser.js falls through to for unmatched requests.
- Database, logger and validator add-ons write under the project's server directory.
- Print the exact `add` commands when `--skip-install` is used, and any config lines the codemod could not apply.
