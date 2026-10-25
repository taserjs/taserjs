import type { HostDefinition } from "./types.js";

export const elysia: HostDefinition = {
  id: "elysia",
  label: "Elysia",
  runtime: "fetch",
  dependencies: ["elysia"],
  devDependencies: [],
  template: `import { Elysia } from "elysia";

const app = new Elysia().get("/host-info", () => ({ framework: "Elysia", status: "online" }));

export default app;
`,
};
