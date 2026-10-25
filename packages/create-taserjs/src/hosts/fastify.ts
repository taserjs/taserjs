import type { HostDefinition } from "./types.js";

export const fastify: HostDefinition = {
  id: "fastify",
  label: "Fastify",
  runtime: "node",
  dependencies: ["fastify"],
  devDependencies: [],
  template: `import Fastify from "fastify";

const app = Fastify();

app.get("/host-info", async () => ({ framework: "Fastify", status: "online" }));

// Plugins and routes must be loaded before Taser.js can call into Fastify's router.
await app.ready();

export default app.routing;
`,
};
