import type { HostDefinition } from "./types.js";

export const express: HostDefinition = {
  id: "express",
  label: "Express",
  runtime: "node",
  dependencies: ["express"],
  devDependencies: ["@types/express"],
  template: `import express from "express";

const app = express();

app.use(express.json());

app.get("/host-info", (_request, response) => {
  response.json({ framework: "Express", status: "online" });
});

export default app;
`,
};
