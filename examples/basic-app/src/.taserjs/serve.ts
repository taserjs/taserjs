// @ts-nocheck
import { FastResponse, serve } from "@taserjs/runtime/serve";
import { app as taserApp } from "./routes.gen.js";
import { mountFetchHost } from "@taserjs/runtime/serve";
import hostEntry from "../server.js";

mountFetchHost(taserApp, hostEntry);

globalThis.Response = FastResponse;

export { taserApp as app };
serve(taserApp);
