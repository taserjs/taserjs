import { Hono } from "hono";

const app = new Hono();

app.get("/host", (c) => {
  return c.json({ message: "Hello, from Host!" });
});

export default app;
