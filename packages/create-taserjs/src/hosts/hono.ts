import type { HostDefinition } from "./types.js";

export const hono: HostDefinition = {
  id: "hono",
  label: "Hono",
  runtime: "fetch",
  dependencies: ["hono"],
  devDependencies: [],
  template: `import { Hono } from "hono";

const app = new Hono();

app.get("/host-info", (context) => context.json({ framework: "Hono", status: "online" }));

export default app;
`,
};
