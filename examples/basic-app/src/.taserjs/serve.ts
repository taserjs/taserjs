// @ts-nocheck
import { FastResponse, serve } from "@taserjs/runtime/serve";
globalThis.Response = FastResponse;
import hostServerEntry from "../server.js";
import { app } from "./routes.gen.js";

const rawHost = hostServerEntry?.default ?? hostServerEntry;
const hostFetch = typeof rawHost?.fetch === "function" ? (r) => rawHost.fetch(r) : typeof rawHost === "function" ? rawHost : null;
if (hostFetch) app.all("*", (c) => hostFetch(c.req.raw));

export { app };
serve(app);
