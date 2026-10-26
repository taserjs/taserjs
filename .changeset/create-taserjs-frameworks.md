---
"create-taserjs": minor
---

feat: Scaffold UI and fullstack projects, and stop choosing a runtime

- New `--framework` option (and a "Base framework" prompt): `none` (API only), `tanstack-router`, `react-router`, `tanstack-start`, `nextjs`, `nuxt`, `sveltekit`, `vite`. UI projects run the framework's official generator and add Taser.js on top (`src/server`, `/api` base path, a typed client in `src/api.ts`, and a config codemod).
- `vite` runs `create-vite` with a TypeScript template picked through the new `--template` option or a "Vite template" prompt: `react` (default), `vue`, `svelte`, `solid` or `preact`. It replaces the earlier `vue` framework, which used `create-vue` with Vue Router.
- Deployment is now a Nitro preset, `node-server` by default (shown as "None" in the prompt). The prompt also offers Cloudflare Workers, Vercel, Netlify and AWS Lambda; `--preset` accepts any Nitro preset. Every project installs Nitro, except Next.js, Nuxt, SvelteKit and React Router, which skip the question and deploy through their own adapter or Nitro preset.
- Breaking: remove `--runtime`, the runtime prompt, the implied-runtime logic, and the generated `wrangler.jsonc` and platform-specific dev dependencies.
- New `--host` option (`none`, `express`, `fastify`, `hono`, `elysia`) for API-only and Vite projects. It scaffolds `server.node.ts` or `server.ts` in the server directory, which Taser.js falls through to for unmatched requests.
- Database, logger and validator add-ons write under the project's server directory.
- Print the exact `add` commands when `--skip-install` is used, and any config lines the codemod could not apply.
