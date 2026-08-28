import { Hono } from "hono";

const app = new Hono();

app.get("/host", (c) => {
  return c.text("Hello from Hono host!");
});

app.get("/host/json", (c) => {
  return c.json({ framework: "hono", status: "ok" });
});

export default app;
